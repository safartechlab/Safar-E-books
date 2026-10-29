const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
  addReview,
  getReviewsForBook,
  getAllReviews,
  getAllReviewsForAdmin,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

// Public: site-wide reviews showcase page
router.get("/all", getAllReviews);

// Admin only: moderation view (every review, including ones with no comment)
router.get("/admin/all", protect, adminOnly, getAllReviewsForAdmin);

// Public: anyone can view reviews for a book
router.get("/book/:bookId", getReviewsForBook);

// Logged-in users only: add/edit/delete
router.post("/", protect, addReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;