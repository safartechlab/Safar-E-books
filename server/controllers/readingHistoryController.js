const Book = require("../models/Book");
const ReadingHistory = require("../models/ReadingHistory");
const mongoose = require("mongoose");

const saveReadingHistory = async (req, res) => {
  try {

    const userId = req.user._id;
    const { bookId } = req.body;
    let currentPage = Number(req.body.currentPage ?? 1);
    let totalPages = Number(req.body.totalPages ?? 1);

    if (!bookId || !mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book id" });
    }

    if (!Number.isInteger(currentPage) || currentPage < 1) {
      return res.status(400).json({
        success: false,
        message: "currentPage must be a whole number of 1 or more",
      });
    }
    if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 100000) {
      return res.status(400).json({
        success: false,
        message: "totalPages must be a whole number between 1 and 100000",
      });
    }
    if (currentPage > totalPages) {
      return res.status(400).json({
        success: false,
        message: "currentPage cannot be greater than totalPages",
      });
    }

    const bookDoc = await Book.findById(bookId).select("editions language pages");
    if (!bookDoc) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const editionList = bookDoc.editions?.length
      ? bookDoc.editions.map((e) => e.language)
      : [bookDoc.language];
    let lang = String(req.body.language || "").trim();
    if (!lang) {
      lang = editionList[0] || "";
    } else {
      const match = editionList.find((l) => String(l).toLowerCase() === lang.toLowerCase());
      if (!match) {
        return res.status(400).json({ success: false, message: "Unknown language for this book" });
      }
      lang = match;
    }

    const matchedEdition = bookDoc.editions?.find(
      (e) => String(e.language).toLowerCase() === String(lang).toLowerCase()
    );
    const knownPages = Number(matchedEdition?.pages || (!bookDoc.editions?.length && bookDoc.pages) || 0);
    if (knownPages > 0) {
      totalPages = knownPages;
      currentPage = Math.min(currentPage, totalPages);
    }

    const calculatedPercentage = Math.round((currentPage / totalPages) * 100);

    const history = await ReadingHistory.findOneAndUpdate(
      {
        user: userId,
        book: bookId,
        language: lang,
      },
      {
        currentPage,
        totalPages,
        percentage: calculatedPercentage,
        lastOpened: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Reading history updated",
      history,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getReadingHistory = async (req, res) => {
  try {
    const allHistory = await ReadingHistory.find({
      user: req.user._id,
    })
      .populate("book")
      .sort({ lastOpened: -1 });

    const isAdmin = req.user.role === "admin";
    const owned = new Set((req.user.purchasedBooks || []).map(String));

    const history = allHistory.filter((h) => {
      const b = h.book;
      if (!b) return false;
      if (isAdmin) return true;
      const isBuyOnce = !b.isFree && !b.isSubscriptionRequired && b.price > 0;
      return !isBuyOnce || owned.has(String(b._id));
    });

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const deleteReadingHistory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading-history id" });
    }

    const deleted = await ReadingHistory.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Reading history entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Removed from reading history",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  saveReadingHistory,
  getReadingHistory,
  deleteReadingHistory,
};