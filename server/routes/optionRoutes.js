const express = require("express");
const router = express.Router();

const { protect, adminOnly, attachUserIfPresent } = require("../middleware/authMiddleware");
const {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
} = require("../controllers/optionController");

// Public: the Library filters and forms need the lists.
// attachUserIfPresent lets an admin also receive per-option book counts.
router.get("/", attachUserIfPresent, getOptions);

// Admin only
router.post("/", protect, adminOnly, createOption);
router.put("/:id", protect, adminOnly, updateOption);
router.delete("/:id", protect, adminOnly, deleteOption);

module.exports = router;