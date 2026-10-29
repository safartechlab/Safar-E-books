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
      default: null, 
    },
  
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

    accessGrantedAt: {
      type: Date,
      default: null,
    },

    failureReason: { type: String, default: "" },

    refundedAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
    refundIds: { type: [String], default: [] },

    needsReview: { type: Boolean, default: false, index: true },
    reviewReason: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.index(
  { user: 1, book: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending", book: { $type: "objectId" } } }
);

module.exports = mongoose.model("Order", orderSchema);