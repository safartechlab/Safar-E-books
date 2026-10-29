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

router.get("/all", getAllReviews);

router.get("/admin/all", protect, adminOnly, getAllReviewsForAdmin);

router.get("/book/:bookId", getReviewsForBook);

router.post("/", protect, addReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;