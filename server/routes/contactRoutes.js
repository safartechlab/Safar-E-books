const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { contactLimiter } = require("../middleware/rateLimiter");

const {
  sendMessage,
  getMessages,
  getUnreadCount,
  replyMessage,
  updateMessageStatus,
  deleteMessage,
  bulkDeleteMessages,
} = require("../controllers/contactController");

router.post("/", contactLimiter, sendMessage);

router.get("/", protect, adminOnly, getMessages);
router.get("/unread-count", protect, adminOnly, getUnreadCount);
router.post("/reply", protect, adminOnly, replyMessage);
router.patch("/:id", protect, adminOnly, updateMessageStatus);
router.delete("/:id", protect, adminOnly, deleteMessage);
router.post("/bulk-delete", protect, adminOnly, bulkDeleteMessages);

module.exports = router;