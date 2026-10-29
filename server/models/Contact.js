const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
        queryType: {
      type: String,
      enum: ["general", "book", "payment", "technical", "feedback", "other"],
      default: "general",
    },

    // Only filled when queryType is "book"
    bookName: {
      type: String,
      default: "",
    },
    
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Contact", contactSchema);