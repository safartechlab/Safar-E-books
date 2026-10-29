const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  saveReadingHistory,
  getReadingHistory,
  deleteReadingHistory,
} = require("../controllers/readingHistoryController");

router.post("/", protect, saveReadingHistory);
router.get("/", protect, getReadingHistory);
router.delete("/:id", protect, deleteReadingHistory);

module.exports = router;