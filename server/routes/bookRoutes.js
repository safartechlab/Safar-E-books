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

router.get("/", attachUserIfPresent, getBooks);
router.get("/suggestions", getBookSuggestions);
router.get("/latest", getLatestBooks);
router.get("/:id", getBookById);
router.get("/:id/pdf", protect, streamBookPdf);
router.post("/:id/read", protect, incrementReadCount);

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

router.post(
  "/:id/editions",
  protect,
  adminOnly,
  upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }, 
  ]),
  addEdition
);
router.put(
  "/:id/editions/:editionId",
  protect,
  adminOnly,
  upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },   
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

router.delete("/:id", protect, adminOnly, deleteBook);
router.post("/:id/restore", protect, adminOnly, restoreBook);
router.delete("/:id/permanent", protect, adminOnly, permanentlyDeleteBook);

module.exports = router;