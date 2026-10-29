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

const countPdfPages = async (buffer) => {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch (e) {
    return 0;
  }
};

const toPublicBook = (book) => {
  const obj = typeof book.toObject === "function" ? book.toObject() : { ...book };
  obj.pdfUrl = obj.pdfUrl ? "available" : "";
  if (Array.isArray(obj.editions)) {
    obj.editions = obj.editions.map((e) => ({ ...e, pdfUrl: e.pdfUrl ? "available" : "" }));
  }
  return obj;
};

const isBadPrice = (raw) => {
  if (raw === undefined || raw === null || raw === "") return false;
  const n = Number(raw);
  return !Number.isFinite(n) || n < 0;
};

const cleanupUploadedFiles = () => {};

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

const parseBoolean = (val) => val === true || val === "true";

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

const syncBookCover = (book) => {
  const def = book.editions?.[0];
  if (!def) return;
  if (def.coverImage) book.coverImage = def.coverImage;
  if (def.pages) book.pages = def.pages;
};

const isCoverInUse = (book, ref) =>
  Boolean(ref) &&
  (book.coverImage === ref || book.editions.some((e) => e.coverImage === ref));

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

const addBook = async (req, res) => {

  let uploadedCover = "";
  let uploadedPdf = "";
  try {
    
    const {
      title,
      author,
      description,
      category,
      language,
      publishedYear,
      isPopular,
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

    let resolvedLanguage;
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
          coverImage,
          pages: firstPages,
        },
      ],
      pages: firstPages,
      publishedYear: Number(publishedYear) || 2026,
      isPopular: parseBoolean(isPopular),
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

    await deleteStoredFile(uploadedCover, "cover");
    await deleteStoredFile(uploadedPdf, "pdf");

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

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

const getLatestBooks = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 24);

    const query = { isArchived: { $ne: true } };
    const accessQuery = buildAccessQuery(req.query.access);
    if (accessQuery) Object.assign(query, accessQuery);

    const books = await Book.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit);

    res.status(200).json({ success: true, books: books.map(toPublicBook) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getBooks = async (req, res) => {
  try {
    const { search, category, language, sort, page, limit, includeArchived, access } = req.query;

    const query = {};

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

const updateBook = async (req, res) => {

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

const permanentlyDeleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

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

    const pdfRefs = new Set(
      [book.pdfUrl, ...(book.editions || []).map((e) => e.pdfUrl)].filter(Boolean)
    );
  
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

    if (req.body.removeCover === "true" && !coverFile) {
      oldCover = edition.coverImage;
      edition.coverImage = "";
    }

    if (req.body.makeDefault === "true") {
      const plain = book.editions.map((e) => e.toObject());
      const at = plain.findIndex((e) => String(e._id) === String(editionId));
      if (at > 0) {
        const [moved] = plain.splice(at, 1);
        plain.unshift(moved);
        book.editions = plain;
      }
    }

    syncBookCover(book);

    await book.save();
    if (oldPdf) deleteStoredFile(oldPdf, "pdf");

    if (oldCover && !isCoverInUse(book, oldCover)) deleteStoredFile(oldCover, "cover");

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