const mongoose = require("mongoose");
const Option = require("../models/Option");
const Book = require("../models/Book");

const TYPES = ["category", "language"];

// Case-insensitive comparison (matches the unique index on the model).
const CI = { locale: "en", strength: 2 };

// Used once, to fill an empty collection. Anything already stored on
// existing books is merged in too, so no current book loses its value.
const DEFAULTS = {
  category: [
    "Fiction", "Non-Fiction", "Science", "Technology", "History", "Biography",
    "Novel", "Fantasy", "Mystery", "Romance", "Self Help", "Education",
  ],
  language: ["English", "Hindi", "Gujarati"],
};

const cleanName = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

// ---------------------------------------------------------------
// First run: if no options exist yet, create them from the old
// hard-coded lists + whatever values books already use.
// ---------------------------------------------------------------
let seeded = false;
const ensureSeeded = async () => {
  if (seeded) return;

  const hasAny = await Option.exists({});
  if (!hasAny) {
    const [usedCategories, usedLanguages] = await Promise.all([
      Book.distinct("category"),
      Book.distinct("language"),
    ]);

    const docs = [];
    const build = (type, defaults, used) => {
      const seen = new Set();
      for (const raw of [...defaults, ...used]) {
        const name = cleanName(raw);
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        docs.push({ type, name });
      }
    };
    build("category", DEFAULTS.category, usedCategories);
    build("language", DEFAULTS.language, usedLanguages);

    try {
      await Option.insertMany(docs, { ordered: false });
    } catch (err) {
      // Two requests seeding at the same moment -> duplicates are fine.
      if (err.code !== 11000 && !err.writeErrors) throw err;
    }
  }
  seeded = true;
};

// Exported so bookController can validate / normalise submitted values.
// Returns the stored (correctly-cased) name, or null if it isn't in the list.
const resolveOptionName = async (type, value) => {
  const name = cleanName(value);
  if (!name) return null;
  await ensureSeeded();
  const found = await Option.findOne({ type, name }).collation(CI);
  return found ? found.name : null;
};

// ---------------------------------------------------------------
// GET /api/options   (public)
// Admins also get `bookCount` per option for the management page.
// ---------------------------------------------------------------
const getOptions = async (req, res) => {
  try {
    await ensureSeeded();

    const options = await Option.find()
      .sort({ name: 1 })
      .collation({ locale: "en" })
      .lean();

    const isAdmin = req.user?.role === "admin";
    const counts = { category: new Map(), language: new Map() };

    if (isAdmin) {
      const [catCounts, langCounts] = await Promise.all([
        Book.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
        Book.aggregate([
          {
            $project: {
              l: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$languages", []] } }, 0] },
                  "$languages",
                  ["$language"],
                ],
              },
            },
          },
          { $unwind: "$l" },
          { $group: { _id: "$l", count: { $sum: 1 } } },
        ]),
      ]);
      catCounts.forEach((c) => counts.category.set(c._id, c.count));
      langCounts.forEach((c) => counts.language.set(c._id, c.count));
    }

    const shape = (type) =>
      options
        .filter((o) => o.type === type)
        .map((o) => ({
          _id: o._id,
          name: o.name,
          ...(isAdmin ? { bookCount: counts[type].get(o.name) || 0 } : {}),
        }));

    res.status(200).json({
      success: true,
      categories: shape("category"),
      languages: shape("language"),
    });
  } catch (error) {
    console.error("[getOptions]", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------
// POST /api/options   { type, name }   (admin)
// ---------------------------------------------------------------
const createOption = async (req, res) => {
  try {
    const { type } = req.body;
    const name = cleanName(req.body.name);

    if (!TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid list type" });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (name.length > 60) {
      return res.status(400).json({ success: false, message: "Name must be 60 characters or fewer" });
    }

    await ensureSeeded();

    const duplicate = await Option.findOne({ type, name }).collation(CI);
    if (duplicate) {
      return res.status(400).json({ success: false, message: `"${duplicate.name}" already exists` });
    }

    const option = await Option.create({ type, name });
    res.status(201).json({ success: true, option });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "That name already exists" });
    }
    console.error("[createOption]", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------
// PUT /api/options/:id   { name }   (admin)
// Books store the category/language as plain text, so a rename also
// updates every book that uses the old name.
// ---------------------------------------------------------------
const updateOption = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const name = cleanName(req.body.name);
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (name.length > 60) {
      return res.status(400).json({ success: false, message: "Name must be 60 characters or fewer" });
    }

    const option = await Option.findById(req.params.id);
    if (!option) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const clash = await Option.findOne({
      type: option.type,
      name,
      _id: { $ne: option._id },
    }).collation(CI);
    if (clash) {
      return res.status(400).json({ success: false, message: `"${clash.name}" already exists` });
    }

    const oldName = option.name;
    if (oldName === name) {
      return res.status(200).json({ success: true, option, updatedBooks: 0 });
    }

    option.name = name;
    await option.save();

    const result = await Book.updateMany(
      { [option.type]: oldName },
      { $set: { [option.type]: name } },
      { timestamps: false }
    );

    // A language also lives inside each book's editions[] / languages[]
    // (and in per-language reading progress), so rename it there too.
    if (option.type === "language") {
      await Book.updateMany(
        { "editions.language": oldName },
        { $set: { "editions.$[e].language": name } },
        { arrayFilters: [{ "e.language": oldName }], timestamps: false }
      );
      await Book.updateMany(
        { languages: oldName },
        { $set: { "languages.$[l]": name } },
        { arrayFilters: [{ l: oldName }], timestamps: false }
      );
      await require("../models/ReadingHistory").updateMany(
        { language: oldName },
        { $set: { language: name } }
      );
    }

    res.status(200).json({
      success: true,
      option,
      updatedBooks: result.modifiedCount || 0,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "That name already exists" });
    }
    console.error("[updateOption]", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------
// DELETE /api/options/:id   (admin)
// Refused while any book (archived ones included) still uses it.
// ---------------------------------------------------------------
const deleteOption = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const option = await Option.findById(req.params.id);
    if (!option) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const inUse = await Book.countDocuments(
      option.type === "language"
        ? { $or: [{ language: option.name }, { languages: option.name }] }
        : { [option.type]: option.name }
    );
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `"${option.name}" is used by ${inUse} book${inUse === 1 ? "" : "s"}. Move those books to another ${option.type} first.`,
      });
    }

    await option.deleteOne();
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("[deleteOption]", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
  resolveOptionName,
};