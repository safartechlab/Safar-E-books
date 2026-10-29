const Banner = require("../models/bannerModel");
const mongoose = require("mongoose");
const Book = require("../models/Book");

// Fields an admin is allowed to set via create/update — req.body is
// arbitrary client input and was previously spread straight into
// Banner.create/findByIdAndUpdate.
const ALLOWED_FIELDS = ["book", "title", "description", "isActive"];
const pickAllowedFields = (body) => {
  const data = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// Hard ceiling on total banners so the homepage carousel can't grow
// unbounded. Raise this if the design ever needs more slots.
const MAX_BANNERS = 10;

// Get all banners. Public visitors only ever see active ones — an admin
// (attachUserIfPresent populates req.user when a valid admin token is
// sent) sees everything, including banners they've turned off, so they
// can re-enable one from the admin panel.
const getAllBanners = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const filter = isAdmin ? {} : { isActive: true };

    const banners = await Banner.find(filter)
      .populate("book")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      banners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Add Banner
const createBanner = async (req, res) => {
  try {
    const { book } = req.body;

    if (!book) {
      return res.status(400).json({
        success: false,
        message: "Book is required",
      });
    }

    if (!mongoose.isValidObjectId(book)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    const bookExists = await Book.exists({ _id: book });
    if (!bookExists) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // Guard 1: the same book can't be turned into a banner twice.
    const duplicate = await Banner.findOne({ book });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "This book already has a banner. Edit the existing one instead of adding a duplicate.",
      });
    }

    // Guard 2: cap the total number of banners so they can't pile up
    // unbounded on the homepage.
    const totalBanners = await Banner.countDocuments();
    if (totalBanners >= MAX_BANNERS) {
      return res.status(400).json({
        success: false,
        message: `You can only have up to ${MAX_BANNERS} banners at a time. Delete an existing one before adding a new one.`,
      });
    }

    const banner = await Banner.create(pickAllowedFields(req.body));

    res.status(201).json({
      success: true,
      banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Update Banner
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid banner id" });
    }

    const data = pickAllowedFields(req.body);

    // If the admin is switching the banner to a different book, that book
    // must be a real id, must exist, and must not already have a banner.
    if (data.book !== undefined) {
      if (!mongoose.isValidObjectId(data.book)) {
        return res.status(400).json({ success: false, message: "Invalid book id" });
      }

      const bookExists = await Book.exists({ _id: data.book });
      if (!bookExists) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      const duplicate = await Banner.findOne({ book: data.book, _id: { $ne: id } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Another banner already uses this book.",
        });
      }
    }

    const banner = await Banner.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({
      success: true,
      banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Delete Banner
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid banner id" });
    }

    const deleted = await Banner.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};