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

    otp: {
      type: String,
      default: "",
      select: false,
    },

    otpExpiry: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

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