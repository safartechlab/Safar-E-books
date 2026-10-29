const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getPublicSettings, updateSettings } = require("../controllers/settingsController");

router.get("/public", getPublicSettings);
router.put("/", protect, adminOnly, updateSettings);

module.exports = router;