const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    author: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    category: {
      type: String,
    },

    coverImage: {
      type: String,
      required: true,
    },

    pdfUrl: {
      type: String,
      required: false,
    },

    language: {
      type: String,
      default: "English",
    },

    editions: [
      {
        language: { type: String, required: true },
        pdfUrl: { type: String, default: "" },
        coverImage: { type: String, default: "" }, 
        pages: { type: Number, default: 0 },
      },
    ],
  
    languages: { type: [String], default: [], index: true },

    pages: {
      type: Number,
    },

    publishedYear: {
      type: Number,
    },

    isNewArrival: {
      type: Boolean,
      default: false,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
    readCount: {
  type: Number,
  default: 0,
},

    isFree: { type: Boolean, default: false },
    isSubscriptionRequired: { type: Boolean, default: false },
    price: { type: Number, default: 0 },

    kindleUrl: { type: String, default: "" },
    amazonPrintUrl: { type: String, default: "" },
    flipkartPrintUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

bookSchema.pre("save", async function () {
  if (this.editions && this.editions.length) {
    const primary = this.editions[0];
    const firstWithPdf = this.editions.find((e) => e.pdfUrl);
    this.language = primary.language;
    this.pages = primary.pages;
    this.pdfUrl = firstWithPdf ? firstWithPdf.pdfUrl : "";
    this.languages = this.editions.map((e) => e.language);
  }
});

module.exports = mongoose.model("Book", bookSchema);