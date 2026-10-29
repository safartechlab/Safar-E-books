const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["book", "subscription"],
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null, // null for subscription orders
    },
    // Only set for type: "subscription" orders — which plan/cycle the user
    // picked. Kept on the order (not just the user) so order history always
    // shows exactly what was purchased, even after the user later upgrades
    // or downgrades their plan.
    plan: {
      type: String,
      enum: ["basic", "medium", "premium", null],
      default: null,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", null],
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
        status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    // Set once access has actually been granted (book added / subscription
    // extended). Used to make verify + webhook idempotent — whichever one
    // arrives first grants access; the other just no-ops instead of
    // re-running $addToSet or re-extending the subscription.
    accessGrantedAt: {
      type: Date,
      default: null,
    },
        // Why Razorpay reported the payment as failed (from the payment.failed webhook)
    failureReason: { type: String, default: "" },

    // Refund tracking (filled by the refund.processed webhook)
    refundedAmount: { type: Number, default: 0 }, // rupees, total across refunds
    refundedAt: { type: Date, default: null },
    refundIds: { type: [String], default: [] },   // makes webhook redelivery idempotent

    // Manual review: something happened that a human must look at
    needsReview: { type: Boolean, default: false, index: true },
    reviewReason: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// One pending order per user+book at a time — lets createOrder reuse an
// existing pending order instead of spawning a duplicate when the same
// checkout is triggered twice (double tab, double click).
orderSchema.index(
  { user: 1, book: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending", book: { $type: "objectId" } } }
);

module.exports = mongoose.model("Order", orderSchema);