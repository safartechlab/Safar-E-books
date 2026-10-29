const transporter = require("../config/email");
const Contact = require("../models/Contact");
const mongoose = require("mongoose");
const escapeRegex = require("../utils/escapeRegex");

// ==========================
// Admin: unread message count — powers the sidebar badge so admins
// notice new messages without opening the Messages page.
// ==========================
const getUnreadCount = async (req, res) => {
  try {
    const count = await Contact.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// 1. Save Contact Message (Public Form)
const sendMessage = async (req, res) => {
  try {
    const { name, email, message, queryType = "general", bookName = "" } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof message !== "string" || !message.trim()
    ) {
      return res.status(400).json({ success: false, message: "Name, email and message are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Name is too long" });
    }
    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: "Message is too long" });
    }

        const allowedTypes = ["general", "book", "payment", "technical", "feedback", "other"];
    if (typeof queryType !== "string" || !allowedTypes.includes(queryType)) {
      return res.status(400).json({ success: false, message: "Invalid query type" });
    }

    let cleanBookName = "";
    if (queryType === "book") {
      if (typeof bookName !== "string" || !bookName.trim()) {
        return res.status(400).json({ success: false, message: "Please enter the book name" });
      }
      if (bookName.trim().length > 200) {
        return res.status(400).json({ success: false, message: "Book name is too long" });
      }
      cleanBookName = bookName.trim();
    }

    await Contact.create({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      queryType,
      bookName: cleanBookName,
    });

    // No need to echo the saved document back to the (public, unauthenticated)
    // caller — just confirm it was sent.
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// 2. Get All Messages (Admin)
// Get All Messages with Pagination, Search & Sorting
const getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build Search & Filter Query
    const searchRegex = escapeRegex(search);
    let query = {
      $or: [
        { name: { $regex: searchRegex, $options: "i" } },
        { email: { $regex: searchRegex, $options: "i" } },
      ],
    };

    if (status === "read") query.isRead = true;
    if (status === "unread") query.isRead = false;

    const totalMessages = await Contact.countDocuments(query);
    const messages = await Contact.find(query)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Send Direct Email Reply (Admin)
const replyMessage = async (req, res) => {
  const { toEmail, subject, message } = req.body;

  if (!toEmail || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    await transporter.sendMail({
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: message,
    });

    res.status(200).json({ success: true, message: "Reply sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send reply email" });
  }
};

// 4. Toggle Read/Unread Status (Admin)
const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid message id" });
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { isRead },
      { new: true }
    );

    res.status(200).json({ success: true, contact: updatedContact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Single Message (Admin)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid message id" });
    }
    await Contact.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Bulk Delete Messages (Admin)
const bulkDeleteMessages = async (req, res) => {
  try {
    const { ids } = req.body;
    await Contact.deleteMany({ _id: { $in: ids } });

    res.status(200).json({ success: true, message: "Selected messages deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadCount,
  replyMessage,
  updateMessageStatus,
  deleteMessage,
  bulkDeleteMessages,
};