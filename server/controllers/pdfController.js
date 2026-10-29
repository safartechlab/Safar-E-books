const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const Book = require("../models/Book");
const { getPdfBuffer, isCloudinaryPdfRef } = require("../utils/cloudinaryStorage");

const PREVIEW_PAGE_LIMIT = 20;

const getPreviewPageCount = (totalPages) => {
  if (totalPages > PREVIEW_PAGE_LIMIT) return PREVIEW_PAGE_LIMIT;
  return Math.max(1, Math.floor(totalPages / 2));
};

const previewCache = new Map();

const buildPreview = async (loadBytes, cacheKey) => {
  const cached = previewCache.get(cacheKey);
  if (cached) return cached;

  const sourceBytes = await loadBytes();
  const sourceDoc = await PDFDocument.load(sourceBytes);
  const totalPages = sourceDoc.getPageCount();
  const pagesToKeep = getPreviewPageCount(totalPages);

  const previewDoc = await PDFDocument.create();
  const copiedPages = await previewDoc.copyPages(
    sourceDoc,
    Array.from({ length: pagesToKeep }, (_, i) => i)
  );
  copiedPages.forEach((page) => previewDoc.addPage(page));

  const previewBytes = Buffer.from(await previewDoc.save());

  previewCache.set(cacheKey, previewBytes);

  if (previewCache.size > 40) previewCache.delete(previewCache.keys().next().value);
  return previewBytes;
};

const findEdition = (book, lang) => {
  const list = book.editions?.length
    ? book.editions
    : [{ language: book.language, pdfUrl: book.pdfUrl, pages: book.pages }];
  if (lang) {
    return (
      list.find(
        (e) => e.pdfUrl && String(e.language).toLowerCase() === String(lang).toLowerCase()
      ) || null
    );
  }
  return list.find((e) => e.pdfUrl) || null;
};

const streamBookPdf = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, message: "Book file not found" });
    }
    const edition = findEdition(book, req.query.lang);
    if (!edition) {
      return res.status(404).json({ success: false, message: "This language is not available" });
    }
    const pdfRef = edition.pdfUrl;

    const hasPurchased = req.user.purchasedBooks?.some(
      (id) => id.toString() === book._id.toString()
    );

    const isAdmin = req.user.role === "admin";

    if (book.isArchived && !isAdmin && !hasPurchased) {
      return res.status(404).json({ success: false, message: "This book is no longer available." });
    }

    const isIndividuallyPaidBook =
      !book.isFree && !book.isSubscriptionRequired && book.price > 0;

    const isCloudFile = isCloudinaryPdfRef(pdfRef);
    const filePath = isCloudFile ? null : path.join(__dirname, "..", pdfRef);

    if (!isCloudFile && !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File missing on server" });
    }

    const hasActiveSubscription = Boolean(
      req.user.isSubscribed &&
      req.user.subscriptionExpiry &&
      new Date(req.user.subscriptionExpiry) > new Date()
    );
   
    let isEntitledToFullFile;
    if (isAdmin || hasPurchased) {
      isEntitledToFullFile = true;
    } else if (isIndividuallyPaidBook) {
      isEntitledToFullFile = false;
    } else if (book.isSubscriptionRequired) {
      isEntitledToFullFile = hasActiveSubscription;
    } else {

      isEntitledToFullFile = Boolean(book.isFree);
    }

    if (!isEntitledToFullFile) {

      const cacheKey = isCloudFile
        ? `${book._id}:${edition.language}:${pdfRef}`
        : `${book._id}:${edition.language}:${fs.statSync(filePath).mtimeMs}`;
      const loadBytes = isCloudFile
        ? () => getPdfBuffer(pdfRef)
        : async () => fs.readFileSync(filePath);
      const previewBytes = await buildPreview(loadBytes, cacheKey);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");

      res.setHeader("Cache-Control", "private, no-store");
      return res.send(previewBytes);
    }

    if (isCloudFile) {
      const fullBytes = await getPdfBuffer(pdfRef);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(fullBytes);
    }

    res.sendFile(filePath);
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { streamBookPdf };