require("dotenv").config();
const mongoose = require("mongoose");
const Book = require("../models/Book");
const User = require("../models/User");
const Order = require("../models/Order");
const ReadingHistory = require("../models/ReadingHistory");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Banner = require("../models/bannerModel");

const APPLY = process.argv.includes("--apply");
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

async function repoint(Model, dupId, primaryId, dupLanguage, perLanguage) {
  const rows = await Model.find({ book: dupId });
  for (const row of rows) {
    const lang = perLanguage ? row.language || dupLanguage : undefined;
    const filter = { book: primaryId, user: row.user };
    if (perLanguage) filter.language = lang;
    if (await Model.exists(filter)) {
      await Model.deleteOne({ _id: row._id });
    } else {
      await Model.updateOne(
        { _id: row._id },
        { $set: { book: primaryId, ...(perLanguage ? { language: lang } : {}) } }
      );
    }
  }
}

async function mergeInto(primaryId, dupIds) {
  const primary = await Book.findById(primaryId);
  if (!primary) throw new Error(`Primary book ${primaryId} not found`);
  if (!primary.editions.length) {
    primary.editions.push({
      language: primary.language || "English",
      pdfUrl: primary.pdfUrl || "",
      pages: primary.pages || 0,
    });
  }
  console.log(`\nMERGE into "${primary.title}" (${primary._id})`);

  for (const dupId of dupIds) {
    const dup = await Book.findById(dupId);
    if (!dup) {
      console.log(`  ! ${dupId} not found, skipped`);
      continue;
    }

    const dupEditions = dup.editions.length
      ? dup.editions.map((e) => ({ language: e.language, pdfUrl: e.pdfUrl, pages: e.pages, coverImage: e.coverImage || "" }))
      : [{ language: dup.language || "English", pdfUrl: dup.pdfUrl || "", pages: dup.pages || 0 }];

    let moved = 0;
    for (const e of dupEditions) {
      if (primary.editions.some((p) => norm(p.language) === norm(e.language))) {
        console.log(`  ! primary already has ${e.language}; "${dup.title}" is only archived`);
        continue;
      }
      primary.editions.push(e);
      moved++;
    }
    if (
      dup.price !== primary.price ||
      dup.isFree !== primary.isFree ||
      dup.isSubscriptionRequired !== primary.isSubscriptionRequired
    ) {
      console.log(`  ! access/price differs on "${dup.title}" (${dup.language}) — the primary's settings win`);
    }
    primary.readCount = (primary.readCount || 0) + (dup.readCount || 0);
    console.log(`  + ${dup.language} ("${dup.title}", ${dup._id}) -> ${moved} edition(s)`);

    if (!APPLY) continue;

    await primary.save(); 

    await User.updateMany({ purchasedBooks: dup._id }, { $addToSet: { purchasedBooks: primary._id } });
    await User.updateMany({ purchasedBooks: dup._id }, { $pull: { purchasedBooks: dup._id } });
    try {
      await Order.updateMany({ book: dup._id }, { $set: { book: primary._id } });
    } catch (e) {
      console.log("  ! some orders could not be moved:", e.message);
    }
    await repoint(Wishlist, dup._id, primary._id, dup.language, false);
    await repoint(Review, dup._id, primary._id, dup.language, false);
    await repoint(ReadingHistory, dup._id, primary._id, dup.language, true);
    try {
      await Banner.updateMany({ book: dup._id }, { $set: { book: primary._id } });
    } catch (e) {
      console.log("  ! banner not moved:", e.message);
    }

    await Book.updateOne({ _id: dup._id }, { $set: { isArchived: true } });
  }
  if (APPLY) await primary.save();
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "APPLY MODE" : "DRY RUN (add --apply to change data)");

  if (APPLY) await ReadingHistory.syncIndexes();

  const mi = process.argv.indexOf("--merge");
  if (mi !== -1) {
    const ids = process.argv.slice(mi + 1).filter((a) => !a.startsWith("--"));
    if (ids.length < 2) throw new Error("Usage: --merge <primaryId> <dupId> [...]");
    await mergeInto(ids[0], ids.slice(1));
  } else {
    const books = await Book.find({ isArchived: { $ne: true } }).sort({ createdAt: 1 });
    const groups = new Map();
    for (const b of books) {
      const key = `${norm(b.title)}|${norm(b.author)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }
    let found = 0;
    for (const list of groups.values()) {
      if (list.length > 1) {
        found++;
        await mergeInto(list[0]._id, list.slice(1).map((b) => b._id));
      }
    }
    if (!found) console.log("\nNo duplicate title+author groups found.");
  }

  const all = await Book.find({});
  let backfilled = 0;
  for (const b of all) {
    if (!b.editions.length) {
      backfilled++;
      if (APPLY) {
        b.editions.push({
          language: b.language || "English",
          pdfUrl: b.pdfUrl || "",
          pages: b.pages || 0,
        });
        await b.save({ validateBeforeSave: false });
      }
    }
    if (APPLY) {
      await ReadingHistory.updateMany(
        { book: b._id, $or: [{ language: { $exists: false } }, { language: "" }] },
        { $set: { language: b.editions[0]?.language || b.language || "" } }
      );
    }
  }
  console.log(`\nBooks needing an editions[] backfill: ${backfilled}`);
  if (!APPLY) console.log("Dry run finished — nothing was changed.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
