const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { protect, adminOnly, attachUserIfPresent } = require("../middleware/authMiddleware");
const { streamBookPdf } = require("../controllers/pdfController");

const {
  addBook,
  initEditions,
  addEdition,
  updateEdition,
  deleteEdition,
  getBooks,
  getLatestBooks,
  getBookSuggestions,
  getBookById,
  updateBook,
  deleteBook,
  permanentlyDeleteBook,
  restoreBook,
  getBookPurchaseCount,
  incrementReadCount,
} = require("../controllers/bookController");

// Public: anyone can browse books. attachUserIfPresent (never blocks)
// lets a logged-in admin optionally see archived books via
// ?includeArchived=true — see getBooks.
router.get("/", attachUserIfPresent, getBooks);
router.get("/suggestions", getBookSuggestions);
// Must stay ABOVE "/:id", otherwise "latest" would be treated as a book id.
router.get("/latest", getLatestBooks);
router.get("/:id", getBookById);
router.get("/:id/pdf", protect, streamBookPdf);
router.post("/:id/read", protect, incrementReadCount);

// Admin only: managing the catalog
router.post(
  "/",
  protect,
  adminOnly,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  addBook
);

// Language editions (one book, many languages) — each can have its own PDF and cover
router.post(
  "/:id/editions",
  protect,
  adminOnly,
  upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },   // NEW
  ]),
  addEdition
);
router.put(
  "/:id/editions/:editionId",
  protect,
  adminOnly,
  upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },   // NEW
  ]),
  updateEdition
);
router.delete("/:id/editions/:editionId", protect, adminOnly, deleteEdition);
router.post("/:id/editions/init", protect, adminOnly, initEditions);

router.get("/:id/purchase-count", protect, adminOnly, getBookPurchaseCount);
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  updateBook
);

// "Delete" archives the book (see bookController.deleteBook) — it
// doesn't erase it or anyone's purchase of it.
router.delete("/:id", protect, adminOnly, deleteBook);
router.post("/:id/restore", protect, adminOnly, restoreBook);
router.delete("/:id/permanent", protect, adminOnly, permanentlyDeleteBook);

module.exports = router;