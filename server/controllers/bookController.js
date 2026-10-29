const mongoose = require("mongoose");
const Book = require("../models/Book");
const Banner = require("../models/bannerModel");
const User = require("../models/User");
const Order = require("../models/Order");
const ReadingHistory = require("../models/ReadingHistory");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const escapeRegex = require("../utils/escapeRegex");
const { isBufferSignatureValid } = require("../utils/fileSignature");
const { uploadCover, uploadPdf, deleteStoredFile } = require("../utils/cloudinaryStorage");
const { resolveOptionName } = require("./optionController");
const { PDFDocument } = require("pdf-lib");

// Reads the real number of pages from an uploaded PDF, so the admin does not
// have to type it (and cannot type it wrong). Returns 0 if it can't be read.
const countPdfPages = async (buffer) => {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch (e) {
    return 0;
  }
};

// What the PUBLIC is allowed to see about a book. The internal file location
// of a PDF ("cloudinary:..." or a server path) is never sent to browsers - only
// "available" / "" so the website can tell whether a PDF exists.
const toPublicBook = (book) => {
  const obj = typeof book.toObject === "function" ? book.toObject() : { ...book };
  obj.pdfUrl = obj.pdfUrl ? "available" : "";
  if (Array.isArray(obj.editions)) {
    obj.editions = obj.editions.map((e) => ({ ...e, pdfUrl: e.pdfUrl ? "available" : "" }));
  }
  return obj;
};

// A price must be a real number, zero or more.
const isBadPrice = (raw) => {
  if (raw === undefined || raw === null || raw === "") return false;
  const n = Number(raw);
  return !Number.isFinite(n) || n < 0;
};

// Uploaded files are held in memory (multer memoryStorage) and only sent
// to Cloudinary once every check has passed, so a rejected request leaves
// nothing behind. Kept as a no-op so the existing call sites stay as they are.
const cleanupUploadedFiles = () => {};

// Checks the real bytes of every uploaded file in req.files against its
// claimed type, deleting (and rejecting) anything that doesn't match —
// see utils/fileSignature.js for why this matters. Returns an error
// message string, or null if everything checked out.
const validateUploadedFileSignatures = (files) => {
  for (const field of ["coverImage", "pdfFile"]) {
    const file = files?.[field]?.[0];
    if (!file) continue;
    if (!isBufferSignatureValid(file.buffer, field)) {
      cleanupUploadedFiles(files);
      return field === "coverImage"
        ? "The cover image file doesn't look like a real JPG/PNG/WEBP image."
        : "The PDF file doesn't look like a real PDF.";
    }
  }
  return null;
};

// Helper to convert form-data string booleans safely
const parseBoolean = (val) => val === true || val === "true";

// Old (not yet migrated) books have no editions[]; turn their single
// language/pdf/cover into editions[0] before we add or change anything.
const ensureEditions = (book) => {
  if (!book.editions.length) {
    book.editions.push({
      language: book.language || "English",
      pdfUrl: book.pdfUrl || "",
      coverImage: book.coverImage || "",
      pages: book.pages || 0,
    });
  }
};

const findEditionByLanguage = (book, language) =>
  book.editions.find(
    (e) => String(e.language).toLowerCase() === String(language).toLowerCase()
  );

// The book's main cover (and page count) always follow the DEFAULT language,
// which is editions[0]. If that language has no cover of its own, the book
// keeps the cover it already has.
const syncBookCover = (book) => {
  const def = book.editions?.[0];
  if (!def) return;
  if (def.coverImage) book.coverImage = def.coverImage;
  if (def.pages) book.pages = def.pages;
};

// Is this stored file still used by the book or by any language?
// Used so we never delete a cover file that something still points to.
const isCoverInUse = (book, ref) =>
  Boolean(ref) &&
  (book.coverImage === ref || book.editions.some((e) => e.coverImage === ref));

// A book should be exactly one of: free, subscription-only, individually
// priced, or "external link only" (no PDF on the site at all — just
// Kindle/Amazon/Flipkart links). Anything else (e.g. all three flags
// false with no price AND no pdf) silently becomes readable by everyone
// via the PDF route, since pdfController's isIndividuallyPaidBook check
// requires price > 0.
//
// hasPdf tells us whether a book file exists (new upload or one already
// on the book) — an "external only" book is allowed to have none of the
// three monetization flags set ONLY when it also has no PDF, since there
// is nothing on the site to gate in that case.
const validateMonetization = (isFree, isSubscriptionRequired, price, hasPdf) => {
  const flagsSet = [isFree, isSubscriptionRequired, price > 0].filter(Boolean).length;
  if (flagsSet === 0 && hasPdf) {
    return "This book has a PDF file, so it must be Free, Subscription-required, or given a price greater than 0.";
  }
  if (isFree && isSubscriptionRequired) {
    return "A book can't be both Free and Subscription-required.";
  }
  if ((isFree || isSubscriptionRequired) && price > 0) {
    return "A Free or Subscription-required book shouldn't also have an individual price.";
  }
  return null;
};

// Add Book
const addBook = async (req, res) => {
  // Track what was uploaded to Cloudinary, so it can be removed again if
  // saving the book fails afterwards.
  let uploadedCover = "";
  let uploadedPdf = "";
  try {
    // NOTE: "pages" is intentionally not read from the request. The page
    // count always comes from the uploaded PDF.
    const {
      title,
      author,
      description,
      category,
      language,
      publishedYear,
      isPopular,
      // Monetization & Store Fields
      isFree,
      isSubscriptionRequired,
      price,
      kindleUrl,
      amazonPrintUrl,
      flipkartPrintUrl,
    } = req.body;
    const resolvedCategory = await resolveOptionName("category", category);
    if (!resolvedCategory) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Please choose a valid category" });
    }

    let resolvedLanguage; // undefined -> schema default ("English")
    if (language?.trim()) {
      resolvedLanguage = await resolveOptionName("language", language);
      if (!resolvedLanguage) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: "Please choose a valid language" });
      }
    }

    if (!title?.trim() || !author?.trim() || !category?.trim()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Title, author and category are required",
      });
    }

    const signatureError = validateUploadedFileSignatures(req.files);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }

    const parsedIsFree = parseBoolean(isFree);
    const parsedIsSubRequired = parseBoolean(isSubscriptionRequired);
    if (isBadPrice(price)) {
      return res.status(400).json({ success: false, message: "Price must be a number, 0 or more." });
    }
    const parsedPrice = Number(price) || 0;

    // Uploaded files (still in memory at this point)
    const hasCover = Boolean(req.files?.coverImage);
    const hasPdf = Boolean(req.files?.pdfFile);

    const monetizationError = validateMonetization(parsedIsFree, parsedIsSubRequired, parsedPrice, hasPdf);
    if (monetizationError) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: monetizationError });
    }

    if (!hasCover) {
      return res.status(400).json({ success: false, message: "A cover image is required" });
    }

    // Send the files to Cloudinary
    try {
      uploadedCover = await uploadCover(req.files.coverImage[0].buffer);
      if (hasPdf) uploadedPdf = await uploadPdf(req.files.pdfFile[0].buffer);
    } catch (uploadError) {
      console.log(uploadError);
      await deleteStoredFile(uploadedCover, "cover");
      await deleteStoredFile(uploadedPdf, "pdf");
      return res.status(502).json({
        success: false,
        message: "Could not upload the files. Please try again.",
      });
    }

    const coverImage = uploadedCover;
    const pdfUrl = uploadedPdf;

    // The page count is always read from the PDF itself.
    const firstPages = hasPdf ? await countPdfPages(req.files.pdfFile[0].buffer) : 0;

    const book = await Book.create({
      title,
      author,
      description,
      category: resolvedCategory,
      coverImage,
      pdfUrl,
      language: resolvedLanguage,
      editions: [
        {
          language: resolvedLanguage || "English",
          pdfUrl,
          coverImage, // the first (default) language owns this cover
          pages: firstPages,
        },
      ],
      pages: firstPages,
      publishedYear: Number(publishedYear) || 2026,
      isPopular: parseBoolean(isPopular),
      // Express/Multer pass req.body values as strings, convert them explicitly:
      isFree: parsedIsFree,
      isSubscriptionRequired: parsedIsSubRequired,
      price: parsedPrice,
      kindleUrl: kindleUrl || "",
      amazonPrintUrl: amazonPrintUrl || "",
      flipkartPrintUrl: flipkartPrintUrl || "",
    });

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      book,
    });
  } catch (error) {
    console.log(error);

    // The book wasn't saved, so don't leave its files on Cloudinary.
    await deleteStoredFile(uploadedCover, "cover");
    await deleteStoredFile(uploadedPdf, "pdf");

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Maps the ?access= query value to a MongoDB filter. Used by the home
// page sections ("Free books", "VIP books") and the Library filters.
//   free -> free to read for everyone
//   vip  -> needs an active subscription
//   paid -> individually priced (buy once)
const buildAccessQuery = (access) => {
  switch (access) {
    case "free":
      return { isFree: true };
    case "vip":
      return { isSubscriptionRequired: true, isFree: { $ne: true } };
    case "paid":
      return {
        isFree: { $ne: true },
        isSubscriptionRequired: { $ne: true },
        price: { $gt: 0 },
      };
    default:
      return null;
  }
};

// Latest books, newest first. Powers the home page "New Arrivals" row:
// it always shows the most recently ADDED books (no manual "mark as new
// arrival" step any more). Optional ?access=free|vip|paid narrows it to
// one kind of book; ?limit= defaults to 6 (max 24).
const getLatestBooks = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 24);

    const query = { isArchived: { $ne: true } };
    const accessQuery = buildAccessQuery(req.query.access);
    if (accessQuery) Object.assign(query, accessQuery);

    // _id is a tie-breaker so books added in the same millisecond (bulk
    // imports) still come back in a stable order.
    const books = await Book.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit);

    res.status(200).json({ success: true, books: books.map(toPublicBook) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get All Books (search/filter always available; pagination only when requested)
const getBooks = async (req, res) => {
  try {
    const { search, category, language, sort, page, limit, includeArchived, access } = req.query;

    const query = {};

    // Archived (soft-deleted) books are hidden from the public catalog.
    // Only a logged-in admin explicitly asking for them (ManageBooks'
    // "Show archived" toggle) sees them.
    const showArchived = req.user?.role === "admin" && includeArchived === "true";
    if (!showArchived) {
      query.isArchived = { $ne: true };
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ title: searchRegex }, { author: searchRegex }];
    }

    if (category) query.category = category;
    if (language) {
      query.$and = [{ $or: [{ languages: language }, { language }] }];
    }

    const accessQuery = buildAccessQuery(access);
    if (accessQuery) Object.assign(query, accessQuery);

    let sortOption = { createdAt: -1 };
    if (sort === "popular") sortOption = { readCount: -1 };
    else if (sort === "az") sortOption = { title: 1 };
    else if (sort === "za") sortOption = { title: -1 };
    else if (sort === "price-low") sortOption = { price: 1 };
    else if (sort === "price-high") sortOption = { price: -1 };

    // Only paginate if the caller explicitly asked for page/limit.
    const isPaginating = page !== undefined || limit !== undefined;

    if (!isPaginating) {
      const books = await Book.find(query).sort(sortOption);
      return res.status(200).json({
        success: true,
        books: books.map(toPublicBook),
      });
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [books, totalBooks] = await Promise.all([
      Book.find(query).sort(sortOption).skip(skip).limit(limitNum),
      Book.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      books: books.map(toPublicBook),
      totalBooks,
      totalPages: Math.ceil(totalBooks / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Single Book
const getBookById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }
    // Note: readCount is NOT incremented here anymore. It used to bump on
    // every fetch of a book's details, and the Reader page separately
    // calls POST /:id/read when someone actually opens the book — so a
    // single "open a book" action was counting as two reads, inflating
    // "Popular" sorting and the dashboard's Total Reads. incrementReadCount
    // below is now the only place readCount changes.

    res.status(200).json({
      success: true,
      book: toPublicBook(book),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Update Book
const updateBook = async (req, res) => {
  // Files uploaded to Cloudinary during this request. If the update fails
  // they are removed again; if it succeeds, the files they replace are.
  let newCover = "";
  let newPdf = "";
  const discardNewUploads = async () => {
    await deleteStoredFile(newCover, "cover");
    await deleteStoredFile(newPdf, "pdf");
  };
  let previousFiles = null;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    // Whitelist — req.body is arbitrary client input, and this used to be
    // spread straight into the update. That let a crafted request set
    // fields never meant to be admin-editable this way, like readCount
    // or isArchived (which has its own dedicated archive/restore route).
    const ALLOWED_FIELDS = [
      "title", "author", "description", "category",
      "publishedYear", "isPopular",
      "isFree", "isSubscriptionRequired", "price",
      "kindleUrl", "amazonPrintUrl", "flipkartPrintUrl",
    ];
    const data = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    // Convert booleans if present in update body
    if (data.isFree !== undefined) data.isFree = parseBoolean(data.isFree);
    if (data.isSubscriptionRequired !== undefined)
      data.isSubscriptionRequired = parseBoolean(data.isSubscriptionRequired);
    if (data.price !== undefined) {
      if (isBadPrice(data.price)) {
        return res.status(400).json({ success: false, message: "Price must be a number, 0 or more." });
      }
      data.price = Number(data.price) || 0;
    }
    if (data.category !== undefined) {
      const resolved = await resolveOptionName("category", data.category);
      if (!resolved) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: "Please choose a valid category" });
      }
      data.category = resolved;
    }
    // language / pages / PDF / cover now live on each edition — see addEdition,
    // updateEdition and deleteEdition below. The book's main cover follows the
    // default language's cover automatically (see syncBookCover).

    // Only re-validate the free/subscription/price combination if the
    // update actually touches one of those three fields — a partial
    // update (e.g. just toggling isNewArrival) shouldn't require resending
    // all three.
    const signatureError = validateUploadedFileSignatures(req.files);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }

    if (req.files?.coverImage) {
      previousFiles = await Book.findById(req.params.id).select("coverImage");
      if (!previousFiles) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      try {
        newCover = await uploadCover(req.files.coverImage[0].buffer);
        data.coverImage = newCover;
      } catch (uploadError) {
        console.log(uploadError);
        await discardNewUploads();
        return res.status(502).json({
          success: false,
          message: "Could not upload the files. Please try again.",
        });
      }
    }

    if (data.isFree !== undefined || data.isSubscriptionRequired !== undefined || data.price !== undefined) {
      const existing = await Book.findById(req.params.id).select("isFree isSubscriptionRequired price pdfUrl");
      if (!existing) {
        await discardNewUploads();
        return res.status(404).json({ success: false, message: "Book not found" });
      }
      const nextIsFree = data.isFree !== undefined ? data.isFree : existing.isFree;
      const nextIsSub = data.isSubscriptionRequired !== undefined ? data.isSubscriptionRequired : existing.isSubscriptionRequired;
      const nextPrice = data.price !== undefined ? data.price : existing.price;
      const nextPdfUrl = data.pdfUrl !== undefined ? data.pdfUrl : existing.pdfUrl;
      const monetizationError = validateMonetization(nextIsFree, nextIsSub, nextPrice, Boolean(nextPdfUrl));
      if (monetizationError) {
        await discardNewUploads();
        return res.status(400).json({ success: false, message: monetizationError });
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      data,
      {
        returnDocument: "after",
      }
    );

    if (!updatedBook) {
      await discardNewUploads();
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // The update worked, so the files that were replaced can go.
    if (newCover && previousFiles?.coverImage) {
      deleteStoredFile(previousFiles.coverImage, "cover");
    }
    if (newPdf && previousFiles?.pdfUrl) {
      deleteStoredFile(previousFiles.pdfUrl, "pdf");
    }

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    console.log(error);
    await discardNewUploads();
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Archive Book (was: hard delete). "Delete" in the admin UI now archives
// the book instead of erasing it — anyone who already purchased it (or
// has it in reading history / wishlist / reviews) keeps a working
// reference; the file is NOT removed from disk. Archived books are just
// hidden from the public catalog (see getBooks' isArchived filter) and
// pulled from any homepage banner.
//
// A genuinely permanent, irreversible delete isn't exposed here on
// purpose — if it's ever needed, do it directly in the database.
const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    const book = await Book.findByIdAndUpdate(bookId, { isArchived: true }, { new: true });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // An archived book shouldn't keep showing on the homepage banner.
    await Banner.deleteMany({ book: bookId });

    res.status(200).json({
      success: true,
      message: "Book archived — it's hidden from the catalog, but anyone who already owns it keeps access.",
      book,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


// Permanently remove an already archived book only when it has no purchase
// history or order audit trail. This prevents breaking access or payment records.
const permanentlyDeleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    // Safety: a book must be archived first, so nobody deletes a live book by accident.
    if (!book.isArchived) {
      return res.status(409).json({
        success: false,
        message: "Archive this book first. Only archived books can be permanently deleted.",
      });
    }

    const [purchaseCount, orderCount] = await Promise.all([
      User.countDocuments({ purchasedBooks: bookId }),
      Order.countDocuments({ book: bookId }),
    ]);
    if (purchaseCount > 0 || orderCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This book has purchase or order history and cannot be permanently deleted. Keep it archived to preserve customer and payment records.",
      });
    }

    await Promise.all([
      ReadingHistory.deleteMany({ book: bookId }),
      Wishlist.deleteMany({ book: bookId }),
      Review.deleteMany({ book: bookId }),
      Banner.deleteMany({ book: bookId }),
    ]);
    await Book.deleteOne({ _id: bookId });

    // Database deletion is complete. File cleanup is best-effort; failed
    // Cloudinary cleanup is logged so an orphan can be removed later.
    // Remove the cover plus the PDF of EVERY language edition.
    const pdfRefs = new Set(
      [book.pdfUrl, ...(book.editions || []).map((e) => e.pdfUrl)].filter(Boolean)
    );
    // The book cover usually equals editions[0].coverImage, so de-duplicate.
    const coverRefs = new Set(
      [book.coverImage, ...(book.editions || []).map((e) => e.coverImage)].filter(Boolean)
    );
    const filesToRemove = [
      ...[...coverRefs].map((ref) => [ref, "cover"]),
      ...[...pdfRefs].map((ref) => [ref, "pdf"]),
    ];
    for (const [storedFile, kind] of filesToRemove) {
      if (!storedFile) continue;
      try { await deleteStoredFile(storedFile, kind); }
      catch (cleanupError) { console.error("Cloudinary cleanup failed for permanently deleted book", cleanupError.message); }
    }
    return res.status(200).json({ success: true, message: "Book permanently deleted." });
  } catch (error) {
    console.error("Permanent book deletion failed:", error);
    return res.status(500).json({ success: false, message: "Could not permanently delete this book." });
  }
};

// Restore a previously archived book back into the public catalog.
const restoreBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    const book = await Book.findByIdAndUpdate(bookId, { isArchived: false }, { new: true });

    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    res.status(200).json({ success: true, message: "Book restored", book });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// Admin: how many users currently own this book
const getBookPurchaseCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ purchasedBooks: req.params.id });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Increment a book's read count

const incrementReadCount = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(200).json({ success: true, skipped: true });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $inc: { readCount: 1 } },
      { new: true, select: "readCount" }
    );

    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    res.status(200).json({ success: true, readCount: book.readCount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Autosuggest for the Contact Us form: up to 8 non-archived books whose
// TITLE contains the typed text (case-insensitive).
const getBookSuggestions = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    if (q.length < 2) {
      return res.status(200).json({ success: true, books: [] });
    }

    const books = await Book.find({
      isArchived: { $ne: true },
      title: new RegExp(escapeRegex(q), "i"),
    })
      .select("title author")
      .sort({ title: 1 })
      .limit(8)
      .lean();

    res.status(200).json({ success: true, books });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------
// Language editions. One Book, many languages: each edition has its own
// PDF, cover and page count. A purchase belongs to the Book, so buying once
// unlocks every language.
//
// The first edition (editions[0]) is the DEFAULT language. The book's main
// cover and page count always follow it (see syncBookCover).
// Page counts are always read from the PDF; admins cannot type them.
// ---------------------------------------------------------------

// POST /api/books/:id/editions  (admin) — add a language
const addEdition = async (req, res) => {
  let uploadedPdf = "";
  let uploadedCover = "";
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    if (!book.isFree && !book.isSubscriptionRequired && !(book.price > 0)) {
      return res.status(400).json({
        success: false,
        message: "Set this book's access to Free, VIP or Paid before adding a PDF.",
      });
    }

    const language = await resolveOptionName("language", req.body.language);
    if (!language) {
      return res.status(400).json({ success: false, message: "Please choose a valid language" });
    }

    ensureEditions(book);
    if (findEditionByLanguage(book, language)) {
      return res.status(409).json({
        success: false,
        message: `This book already has a ${language} edition.`,
      });
    }

    const signatureError = validateUploadedFileSignatures(req.files);
    if (signatureError) return res.status(400).json({ success: false, message: signatureError });

    const pdfFile = req.files?.pdfFile?.[0];
    if (!pdfFile) {
      return res.status(400).json({ success: false, message: "Please upload the PDF for this language" });
    }

    try {
      uploadedPdf = await uploadPdf(pdfFile.buffer);
      const coverFile = req.files?.coverImage?.[0];
      if (coverFile) uploadedCover = await uploadCover(coverFile.buffer);
    } catch (e) {
      console.log(e);
      await deleteStoredFile(uploadedPdf, "pdf");
      await deleteStoredFile(uploadedCover, "cover");
      return res.status(502).json({ success: false, message: "Could not upload the file. Please try again." });
    }

    // Always read from the PDF.
    const editionPages = await countPdfPages(pdfFile.buffer);

    book.editions.push({
      language,
      pdfUrl: uploadedPdf,
      coverImage: uploadedCover,
      pages: editionPages,
    });
    syncBookCover(book);
    await book.save();

    res.status(201).json({ success: true, message: `${language} edition added`, book });
  } catch (error) {
    console.log(error);
    await deleteStoredFile(uploadedPdf, "pdf");
    await deleteStoredFile(uploadedCover, "cover");
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PUT /api/books/:id/editions/:editionId  (admin) — change language / PDF / cover / default
const updateEdition = async (req, res) => {
  let newPdf = "";
  let newCover = "";
  try {
    const { id, editionId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(editionId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    const edition = book.editions.id(editionId);
    if (!edition) return res.status(404).json({ success: false, message: "Edition not found" });

    const previousLanguage = edition.language;

    if (req.body.language !== undefined) {
      const language = await resolveOptionName("language", req.body.language);
      if (!language) {
        return res.status(400).json({ success: false, message: "Please choose a valid language" });
      }
      const clash = book.editions.find(
        (e) =>
          String(e._id) !== String(editionId) &&
          e.language.toLowerCase() === language.toLowerCase()
      );
      if (clash) {
        return res.status(409).json({ success: false, message: `A ${language} edition already exists.` });
      }
      edition.language = language;
    }

    // NOTE: a typed "pages" value is ignored on purpose. The page count is
    // read from the PDF whenever a PDF is uploaded.

    const signatureError = validateUploadedFileSignatures(req.files);
    if (signatureError) return res.status(400).json({ success: false, message: signatureError });

    let oldPdf = "";
    const pdfFile = req.files?.pdfFile?.[0];
    if (pdfFile) {
      try {
        newPdf = await uploadPdf(pdfFile.buffer);
      } catch (e) {
        console.log(e);
        return res.status(502).json({ success: false, message: "Could not upload the file. Please try again." });
      }
      oldPdf = edition.pdfUrl;
      edition.pdfUrl = newPdf;
      // New PDF -> always re-read the page count from the file.
      const detected = await countPdfPages(pdfFile.buffer);
      if (detected) edition.pages = detected;
    }

    let oldCover = "";
    const coverFile = req.files?.coverImage?.[0];
    if (coverFile) {
      try {
        newCover = await uploadCover(coverFile.buffer);
      } catch (e) {
        console.log(e);
        await deleteStoredFile(newPdf, "pdf");
        return res.status(502).json({ success: false, message: "Could not upload the file. Please try again." });
      }
      oldCover = edition.coverImage;
      edition.coverImage = newCover;
    }

    // Admin clicked "Reset" -> this language goes back to the book's main cover
    if (req.body.removeCover === "true" && !coverFile) {
      oldCover = edition.coverImage;
      edition.coverImage = "";
    }

    // "Make this the default language" -> move it to the front of the list.
    if (req.body.makeDefault === "true") {
      const plain = book.editions.map((e) => e.toObject());
      const at = plain.findIndex((e) => String(e._id) === String(editionId));
      if (at > 0) {
        const [moved] = plain.splice(at, 1);
        plain.unshift(moved);
        book.editions = plain;
      }
    }

    // The book's main cover + page count follow the (possibly new) default language.
    syncBookCover(book);

    await book.save();
    if (oldPdf) deleteStoredFile(oldPdf, "pdf");
    // Only delete the old cover if nothing (book or language) still uses it,
    // so resetting the default language's cover never breaks the main cover.
    if (oldCover && !isCoverInUse(book, oldCover)) deleteStoredFile(oldCover, "cover");

    // A renamed language must keep everybody's saved reading place.
    if (edition.language !== previousLanguage) {
      await ReadingHistory.updateMany(
        { book: id, language: previousLanguage },
        { $set: { language: edition.language } }
      );
    }

    res.status(200).json({ success: true, message: "Edition updated", book });
  } catch (error) {
    console.log(error);
    await deleteStoredFile(newPdf, "pdf");
    await deleteStoredFile(newCover, "cover");
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DELETE /api/books/:id/editions/:editionId  (admin)
const deleteEdition = async (req, res) => {
  try {
    const { id, editionId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(editionId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    const edition = book.editions.id(editionId);
    if (!edition) return res.status(404).json({ success: false, message: "Edition not found" });

    if (book.editions.length <= 1) {
      return res.status(400).json({
        success: false,
        message: "A book needs at least one language. Archive the book instead.",
      });
    }

    // Never remove the only language that has a readable PDF.
    const otherHasPdf = book.editions.some(
      (e) => String(e._id) !== String(editionId) && e.pdfUrl
    );
    if (edition.pdfUrl && !otherHasPdf) {
      return res.status(400).json({
        success: false,
        message: "This is the only language with a PDF. Upload a PDF for another language first, or archive the book.",
      });
    }

    const { pdfUrl, coverImage, language } = edition;
    book.editions.pull(editionId);
    // If the default language was removed, the next one becomes the default
    // and its cover becomes the book's main cover.
    syncBookCover(book);
    await book.save();

    await ReadingHistory.deleteMany({ book: id, language });
    if (pdfUrl) await deleteStoredFile(pdfUrl, "pdf");
    if (coverImage && !isCoverInUse(book, coverImage)) {
      await deleteStoredFile(coverImage, "cover");
    }

    res.status(200).json({ success: true, message: `${language} edition removed`, book });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/books/:id/editions/init  (admin)
// Old books (added before "languages") have no editions list. This upgrades one
// in place, so the admin can manage its languages straight away.
const initEditions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    if (!book.editions.length) {
      ensureEditions(book);
      if (!book.editions[0].pages && book.pages) book.editions[0].pages = book.pages;
      await book.save();
    }
    res.status(200).json({ success: true, book });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  initEditions,
  addBook,
  addEdition,
  updateEdition,
  deleteEdition,
  getBookSuggestions,
  getBooks,
  getLatestBooks,
  getBookById,
  updateBook,
  deleteBook,
  permanentlyDeleteBook,
  restoreBook,
  getBookPurchaseCount,
  incrementReadCount,
};