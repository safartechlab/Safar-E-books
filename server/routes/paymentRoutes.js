const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");

const {
  createOrder,
  verifyPayment,
  getMyOrders,
  cancelSubscription,
  setAutoRenew,
} = require("../controllers/paymentController");

const {
  getAdminOrders,
  exportAdminOrders,
  getAdminOrderSummary,
  markOrderReviewed,
  getRevenueAnalytics,
} = require("../controllers/adminOrderController");


router.post("/create-order", protect, paymentLimiter, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/my-orders", protect, getMyOrders);
router.post("/cancel-subscription", protect, cancelSubscription);
router.post("/auto-renew", protect, setAutoRenew);

// ===== Admin only =====
router.get("/admin/orders", protect, adminOnly, getAdminOrders);
router.get("/admin/orders/export", protect, adminOnly, exportAdminOrders);
router.get("/admin/summary", protect, adminOnly, getAdminOrderSummary);
router.get("/admin/analytics", protect, adminOnly, getRevenueAnalytics);
router.patch("/admin/orders/:id/review", protect, adminOnly, markOrderReviewed);

module.exports = router;