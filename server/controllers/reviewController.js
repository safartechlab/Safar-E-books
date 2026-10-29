const Book = require("../models/Book");
const Review = require("../models/Review");
const mongoose = require("mongoose");
const escapeRegex = require("../utils/escapeRegex");

const addReview = async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;

    if (!bookId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Book and rating are required",
      });
    }

    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    const bookExists = await Book.exists({ _id: bookId });
    if (!bookExists) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const existing = await Review.findOne({ book: bookId, user: req.user._id });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this book. You can edit your existing review instead.",
      });
    }

    const review = await Review.create({
      book: bookId,
      user: req.user._id,
      rating: Number(rating),
      comment: comment || "",
    });

    const populatedReview = await review.populate("user", "name");

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
g
const getReviewsForBook = async (req, res) => {
  try {
    const { bookId } = req.params;
      if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    const reviews = await Review.find({ book: bookId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount === 0
        ? 0
        : Number(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
          );

    res.status(200).json({
      success: true,
      reviews,
      reviewCount,
      averageRating,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit) || 12));
    const sort = req.query.sort === "rating" ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

    const listFilter = { comment: { $exists: true, $ne: "" } };
    const minRating = parseInt(req.query.minRating);
    if (minRating >= 1 && minRating <= 5) {
      listFilter.rating = { $gte: minRating };
    }

    const [reviews, totalCount, statsAgg, distinctBooks] = await Promise.all([
      Review.find(listFilter)
        .populate("user", "name")
        .populate("book", "title coverImage")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(listFilter),

      Review.aggregate([
        { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Review.distinct("book"),
    ]);

    const cleanReviews = reviews.filter((r) => r.book);

    res.status(200).json({
      success: true,
      reviews: cleanReviews,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
      stats: {
        averageRating: statsAgg[0] ? Number(statsAgg[0].avgRating.toFixed(1)) : 0,
        totalReviews: statsAgg[0] ? statsAgg[0].count : 0,
        totalBooksReviewed: distinctBooks.length,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getAllReviewsForAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));

    const sortOption =
      req.query.sort === "rating-high"
        ? { rating: -1, createdAt: -1 }
        : req.query.sort === "rating-low"
        ? { rating: 1, createdAt: -1 }
        : { createdAt: -1 }; 

    const filter = {};

    const minRating = parseInt(req.query.minRating);
    if (minRating >= 1 && minRating <= 5) {
      filter.rating = minRating;
    }

    const search = (req.query.search || "").trim();
    if (search) {
    
      filter.comment = { $regex: escapeRegex(search), $options: "i" };
    }

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email")
        .populate("book", "title coverImage")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      reviews,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid review id" });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own review",
      });
    }

    if (rating !== undefined) {
      if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = Number(rating);
    }

    if (comment !== undefined) review.comment = comment;

    await review.save();

    const populatedReview = await review.populate("user", "name");

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid review id" });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own review",
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  addReview,
  getReviewsForBook,
  getAllReviews,
  getAllReviewsForAdmin,
  updateReview,
  deleteReview,
};