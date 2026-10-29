const Razorpay = require("razorpay");
const Order = require("../models/Order");
const { grantAccessForOrder } = require("../controllers/paymentController");
const MIN_ORDER_AGE_MINUTES = 5;
const MAX_ORDER_AGE_HOURS = 24;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const runReconciliation = async () => {

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return;
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const now = Date.now();
    const olderThan = new Date(now - MIN_ORDER_AGE_MINUTES * 60 * 1000);
    const newerThan = new Date(now - MAX_ORDER_AGE_HOURS * 60 * 60 * 1000);
    const pendingOrders = await Order.find({

      status: { $in: ["pending", "failed"] },
      accessGrantedAt: null,
      createdAt: { $lte: olderThan, $gte: newerThan },
    });

    for (const order of pendingOrders) {
      try {
        const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
        const captured = (payments?.items || []).find((p) => p.status === "captured");

        if (!captured) continue;

        await grantAccessForOrder(order, {
          paymentId: captured.id,
          paidAmountPaise: captured.amount,
        });

        console.log(
          `[reconcile-orders] granted access for order ${order._id} (razorpay ${order.razorpayOrderId}) — payment found via reconciliation, not webhook/verify`
        );
      } catch (err) {
   
        console.error(`[reconcile-orders] failed to check order ${order._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[reconcile-orders] check failed:", error);
  }
};

const startReconciliationJob = () => {
  setTimeout(runReconciliation, 2 * 60 * 1000); 
  setInterval(runReconciliation, CHECK_INTERVAL_MS);
};

module.exports = { startReconciliationJob, runReconciliation };
