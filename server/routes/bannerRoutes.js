const express = require("express");
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Public: banners shown on homepage
router.get("/", getAllBanners);

// Admin only
router.post("/", protect, adminOnly, createBanner);
router.put("/:id", protect, adminOnly, updateBanner);
router.delete("/:id", protect, adminOnly, deleteBanner);

module.exports = router;