const mongoose = require("mongoose");

const readingHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    totalPages: {
      type: Number,
      default: 1,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    // Which language edition this progress is for (reading pages differ
    // per language, so each gets its own bookmark).
    language: {
      type: String,
      default: "",
    },
    lastOpened: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

readingHistorySchema.index(
  { user: 1, book: 1, language: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ReadingHistory",
  readingHistorySchema
);