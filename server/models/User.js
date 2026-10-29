const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    password: {
      type: String,
      required: true,
    },
    // OTP is stored as a SHA-256 hash, never the raw code. Never returned
    // by default (select: false) — controllers that need it must
    // .select("+otp +otpExpiry +otpAttempts") explicitly.
    otp: {
      type: String,
      default: "",
      select: false,
    },

    otpExpiry: {
      type: Date,
      select: false,
    },

    // Wrong guesses against the current OTP. After too many, the OTP is
    // voided (forces a fresh code) instead of allowing unlimited guessing.
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Issued only after a successful verifyOtp call; proves the user
    // actually owns the email before resetPassword will accept a new password.
    resetToken: {
      type: String,
      default: null,
      select: false,
    },

    resetTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },

    subscriptionExpiry: {
      type: Date,
      default: null,
    },

    // Which plan/cycle the user's current (or most recent) subscription is
    // for — set whenever a subscription order is paid. Used to show the
    // user their plan in Profile/MyPurchases; NOT used to determine access
    // (isSubscribed + subscriptionExpiry alone still gate that).
    subscriptionPlan: {
      type: String,
      enum: ["basic", "medium", "premium", null],
      default: null,
    },
    subscriptionCycle: {
      type: String,
      enum: ["monthly", "quarterly", null],
      default: null,
    },

    autoRenew: {
      type: Boolean,
      default: true,
    },

    renewalReminderSentFor: {
      type: Date,
      default: null,
    },

    purchasedBooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],

    activeSessions: {
      type: [
        {
          _id: false,
          tokenId: { type: String, required: true },
          device: { type: String, default: "Unknown device" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);