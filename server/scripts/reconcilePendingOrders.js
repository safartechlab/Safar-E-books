const Razorpay = require("razorpay");
const Order = require("../models/Order");
const { grantAccessForOrder } = require("../controllers/paymentController");

// This exists because the Razorpay webhook needs a public URL, and the
// project doesn't have a domain to point it at yet. Without the webhook,
// the ONLY thing that ever marks an order "paid" is the client calling
// /payments/verify right after checkout — if the browser tab closes before
// that call fires (dropped connection, closed popup, phone locks mid-pay),
// the customer has paid but never gets access, and nothing ever notices.
//
// This job is a safety net for exactly that case: it periodically asks
// Razorpay directly "was this order actually paid?" for any order that's
// still sitting in "pending", and grants access if Razorpay says yes.
//
// Once the project has a real domain, set up the Razorpay webhook (see
// RAZORPAY_WEBHOOK_SECRET in .env.example) — the webhook is faster and
// should remain the primary path. This job is a backstop that also still
// helps in production if a webhook delivery is ever missed.

// Skip anything younger than this — the client-side /verify call for a
// checkout that's still in progress hasn't had a chance to run yet, so
// checking Razorpay this early would just be wasted API calls.
const MIN_ORDER_AGE_MINUTES = 5;

// Don't bother checking anything older than this — Razorpay treats an
// order as expired/abandoned well before this, and Order.createOrder
// already sweeps pending orders older than 60 minutes to "failed" the
// next time that same user starts a new checkout.
const MAX_ORDER_AGE_HOURS = 24;

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

const runReconciliation = async () => {
  // Guard against running before Razorpay credentials are actually
  // configured (e.g. first boot in a fresh dev environment).
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
      // Also re-check orders that createOrder's stale-sweep already
      // marked "failed" — that sweep only means "the client never came
      // back to /verify within 60 minutes", NOT "Razorpay confirms this
      // was never paid". A slow/late payment (bank delay, offline UPI
      // confirmation) can still land after that sweep runs, and without
      // this the customer would be charged with no access and no one
      // would ever notice.
      status: { $in: ["pending", "failed"] },
      accessGrantedAt: null,
      createdAt: { $lte: olderThan, $gte: newerThan },
    });

    for (const order of pendingOrders) {
      try {
        const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
        const captured = (payments?.items || []).find((p) => p.status === "captured");

        if (!captured) continue; // genuinely still unpaid/abandoned — leave it pending

        await grantAccessForOrder(order, {
          paymentId: captured.id,
          paidAmountPaise: captured.amount,
        });

        console.log(
          `[reconcile-orders] granted access for order ${order._id} (razorpay ${order.razorpayOrderId}) — payment found via reconciliation, not webhook/verify`
        );
      } catch (err) {
        // Don't let one bad lookup stop the rest of the batch.
        console.error(`[reconcile-orders] failed to check order ${order._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[reconcile-orders] check failed:", error);
  }
};

const startReconciliationJob = () => {
  setTimeout(runReconciliation, 2 * 60 * 1000); // give the server a couple minutes after boot
  setInterval(runReconciliation, CHECK_INTERVAL_MS);
};

module.exports = { startReconciliationJob, runReconciliation };
