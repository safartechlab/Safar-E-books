const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");
const {
  createRefundRequest,
  getMyRefundRequests,
  getAdminRefundRequests,
  getPendingRefundCount,
  approveRefundRequest,
  rejectRefundRequest,
} = require("../controllers/refundController");

router.post("/", protect, paymentLimiter, createRefundRequest);
router.get("/my", protect, getMyRefundRequests);

router.get("/admin", protect, adminOnly, getAdminRefundRequests);
router.get("/admin/pending-count", protect, adminOnly, getPendingRefundCount);
router.patch("/admin/:id/approve", protect, adminOnly, approveRefundRequest);
router.patch("/admin/:id/reject", protect, adminOnly, rejectRefundRequest);

module.exports = router;