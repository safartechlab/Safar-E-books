const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const Book = require("../models/Book");
const { getPdfBuffer, isCloudinaryPdfRef } = require("../utils/cloudinaryStorage");

// Must match Reader.jsx's PREVIEW_PAGE_LIMIT exactly — that constant is the
// UI's promise ("preview: 20 pages"); this one is what actually enforces it.
const PREVIEW_PAGE_LIMIT = 20;

// How many pages a non-entitled reader gets to see. Normally the first
// PREVIEW_PAGE_LIMIT pages. For a book that is itself 20 pages or fewer, a
// "20 page preview" would hand over the WHOLE book for free, so those only
// show the first half (at least 1 page).
const getPreviewPageCount = (totalPages) => {
  if (totalPages > PREVIEW_PAGE_LIMIT) return PREVIEW_PAGE_LIMIT;
  return Math.max(1, Math.floor(totalPages / 2));
};

// Building a trimmed preview with pdf-lib isn't free, and the result is
// identical for every non-entitled viewer of a given book — so cache it
// in memory per book. Keyed by the source file's mtime, so re-uploading a
// book's PDF automatically invalidates the old cached preview.
const previewCache = new Map();

// loadBytes: function that returns the full PDF's bytes (only called when
// there is no cached preview yet).
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

  // Simple unbounded cache is fine for a catalog-sized number of VIP
  // books; if the catalog grows very large, swap this for an LRU cache.
  previewCache.set(cacheKey, previewBytes);
  // Keep memory under control: only remember the most recent previews.
  if (previewCache.size > 40) previewCache.delete(previewCache.keys().next().value);
  return previewBytes;
};

// Picks which language's PDF to serve. ?lang=Hindi -> that edition;
// no lang -> the first edition that has a PDF. Works for old, unmigrated
// books too (they have no editions[] yet).
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

    // An archived book is hidden from the shop. Only people who already own it
    // (and admins) may still open it.
    if (book.isArchived && !isAdmin && !hasPurchased) {
      return res.status(404).json({ success: false, message: "This book is no longer available." });
    }

    // Individually-priced books (not free, NOT subscription-based) are
    // "buy once" books. Until bought, a reader only gets the first
    // PREVIEW_PAGE_LIMIT pages (see the entitlement check below) — the full
    // file is never sent to them.
    const isIndividuallyPaidBook =
      !book.isFree && !book.isSubscriptionRequired && book.price > 0;

    // New uploads live on Cloudinary ("cloudinary:<id>"); books added
    // before the switch still point at a local file under /uploads.
    const isCloudFile = isCloudinaryPdfRef(pdfRef);
    const filePath = isCloudFile ? null : path.join(__dirname, "..", pdfRef);

    if (!isCloudFile && !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File missing on server" });
    }

    // VIP and "buy once" books: mirror Reader.jsx's own gating logic so the
    // server enforces exactly what the UI promises. Anyone who is not
    // entitled to the full file gets a server-generated preview containing
    // only the first PREVIEW_PAGE_LIMIT pages — the real file is never sent
    // to them, so there is nothing to extract past that cap via browser dev
    // tools or a direct API call.
    const hasActiveSubscription = Boolean(
      req.user.isSubscribed &&
      req.user.subscriptionExpiry &&
      new Date(req.user.subscriptionExpiry) > new Date()
    );
    // Who gets the FULL file:
    //   - admins and anyone who bought this exact book
    //   - for "buy once" books: ONLY the above (a subscription does not unlock them)
    //   - for VIP books: anyone with an active subscription
    //   - for free books: everybody
    let isEntitledToFullFile;
    if (isAdmin || hasPurchased) {
      isEntitledToFullFile = true;
    } else if (isIndividuallyPaidBook) {
      isEntitledToFullFile = false;
    } else if (book.isSubscriptionRequired) {
      isEntitledToFullFile = hasActiveSubscription;
    } else {
      // Only a book marked FREE is open to everybody. A book with no access
      // type set at all is NOT free by accident - it shows the preview only.
      isEntitledToFullFile = Boolean(book.isFree);
    }

    if (!isEntitledToFullFile) {
      // A re-uploaded PDF gets a new id (cloud) or a new mtime (local), so
      // the cached preview of the old file is never reused.
      const cacheKey = isCloudFile
        ? `${book._id}:${edition.language}:${pdfRef}`
        : `${book._id}:${edition.language}:${fs.statSync(filePath).mtimeMs}`;
      const loadBytes = isCloudFile
        ? () => getPdfBuffer(pdfRef)
        : async () => fs.readFileSync(filePath);
      const previewBytes = await buildPreview(loadBytes, cacheKey);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      // Never let a browser/proxy keep the preview around: right after a
      // purchase the very same URL must return the full book.
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