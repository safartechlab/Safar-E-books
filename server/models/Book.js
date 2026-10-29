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

    // One entry per language. editions[0] is the default/primary one.
    // The top-level language / pdfUrl / pages fields above are kept in sync
    // with these by the pre-save hook at the bottom of this file.
    editions: [
      {
        language: { type: String, required: true },
        pdfUrl: { type: String, default: "" },
        coverImage: { type: String, default: "" }, 
        pages: { type: Number, default: 0 },
      },
    ],
    // Plain list of language names, used for fast filtering.
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

    // Soft-delete flag. "Delete" in the admin panel archives a book
    // instead of removing it — anyone who already bought it (or has it
    // in reading history / wishlist / reviews) keeps a working reference.
    // Archived books are hidden from public catalog/search but the
    // record (and its file) stays on disk.
    isArchived: {
      type: Boolean,
      default: false,
    },
    readCount: {
  type: Number,
  default: 0,
},
// Monetization & Access Flags
    isFree: { type: Boolean, default: false },
    isSubscriptionRequired: { type: Boolean, default: false },
    price: { type: Number, default: 0 },

    // External Platform Purchase Links
    kindleUrl: { type: String, default: "" },
    amazonPrintUrl: { type: String, default: "" },
    flipkartPrintUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Keep the legacy single-language fields in sync with editions[].
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