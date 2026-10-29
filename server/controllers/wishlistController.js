const Book = require("../models/Book");
const Wishlist = require("../models/Wishlist");
const mongoose = require("mongoose");

const addWishlist = async (req, res) => {
    try {

        const user = req.user._id;
        const { book } = req.body;

        if (!book || !mongoose.isValidObjectId(book)) {
            return res.status(400).json({ success: false, message: "Invalid book id" });
        }

        const bookExists = await Book.exists({ _id: book, isArchived: { $ne: true } });
        if (!bookExists) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        const exists = await Wishlist.findOne({ user, book });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Book already in wishlist",
            });
        }

        const wishlist = await Wishlist.create({
            user,
            book,
        });

        res.status(201).json({
            success: true,
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

const removeWishlist = async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!mongoose.isValidObjectId(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book id" });
        }

        await Wishlist.findOneAndDelete({
            user: req.user._id,
            book: bookId,
        });

        res.json({
            success: true,
            message: "Removed from wishlist",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

const getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.find({
            user: req.user._id,
        }).populate("book");

        res.json({
            success: true,
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

const checkWishlist = async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!mongoose.isValidObjectId(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book id" });
        }

        const exists = await Wishlist.findOne({
            user: req.user._id,
            book: bookId,
        });

        res.json({
            success: true,
            exists: !!exists,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

module.exports = { addWishlist, removeWishlist, getWishlist, checkWishlist };