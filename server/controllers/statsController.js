const User = require("../models/User");
const Book = require("../models/Book");
const Review = require("../models/Review");

// Public, read-only platform numbers for the About page.
// Cached for 5 minutes so a busy About page can't hammer the database.
const CACHE_MS = 5 * 60 * 1000;
let cache = { data: null, time: 0 };

const getPublicStats = async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.time < CACHE_MS) {
      return res.status(200).json({ success: true, stats: cache.data });
    }

    const [readers, books, reviewAgg] = await Promise.all([
      User.countDocuments({ role: "user", status: "active", isVerified: true }),
      Book.countDocuments({ isArchived: { $ne: true } }),
      Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            positiveReviews: {
              $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const r = reviewAgg[0];
    const stats = {
      readers,
      books,
      totalReviews: r?.totalReviews || 0,
      // null when there are no reviews yet, so the UI shows "—"
      averageRating: r ? Number(r.avgRating.toFixed(1)) : null,
      satisfaction: r
        ? Number(((r.positiveReviews / r.totalReviews) * 100).toFixed(1))
        : null,
    };

    cache = { data: stats, time: Date.now() };
    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { getPublicStats };