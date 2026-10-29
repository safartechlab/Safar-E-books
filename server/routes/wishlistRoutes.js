const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  addWishlist,
  removeWishlist,
  getWishlist,
  checkWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

router.post("/add", protect, addWishlist);
router.delete("/remove/:bookId", protect, removeWishlist);
router.get("/check/:bookId", protect, checkWishlist);
router.get("/", protect, getWishlist);

module.exports = router;