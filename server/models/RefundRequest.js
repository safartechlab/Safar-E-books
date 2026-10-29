const mongoose = require("mongoose");

const REASONS = [
  "duplicate_charge",
  "no_access",
  "wrong_amount",
  "defective_file",
  "technical_fault",
  "other",
];

const refundRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // One request per order, so nobody can spam the same order.
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, default: "", maxlength: 1000 },
    // "processing" is a short lock while the Razorpay call is in flight, so a
    // double click can never send two refunds.
    status: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    adminNote: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 }, // rupees
    razorpayRefundId: { type: String, default: "" },
    accessRevoked: { type: Boolean, default: false },
    // How many times the customer sent this request again after a rejection (max 1).
    resubmitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const RefundRequest = mongoose.model("RefundRequest", refundRequestSchema);
RefundRequest.REASONS = REASONS;
module.exports = RefundRequest;