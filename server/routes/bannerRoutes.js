const express = require("express");
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllBanners);

router.post("/", protect, adminOnly, createBanner);
router.put("/:id", protect, adminOnly, updateBanner);
router.delete("/:id", protect, adminOnly, deleteBanner);

module.exports = router;