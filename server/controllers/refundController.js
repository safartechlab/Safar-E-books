const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const RefundRequest = require("../models/RefundRequest");
const Order = require("../models/Order");
const User = require("../models/User");
const transporter = require("../config/email");
const { getPlanPrice } = require("../config/plans");
const ReadingHistory = require("../models/ReadingHistory");

const { REASONS } = RefundRequest;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const REFUND_REQUEST_DAYS = 7; // must match RefundPolicy.jsx
const DAY_MS = 24 * 60 * 60 * 1000;

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const itemName = (order) =>
  order?.type === "book"
    ? order.book?.title || "E-book"
    : `${cap(order?.plan) || "Premium"} subscription${order?.billingCycle ? ` (${order.billingCycle})` : ""}`;

// An email problem must never break the refund flow.
const safeMail = async (opts) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, ...opts });
  } catch (e) {
    console.error("[refunds] email failed:", e.message);
  }
};

// Take back the book the order gave the customer.
const revokeAccess = async (order) => {
  if (order.type === "book" && order.book) {
    const bookId = order.book._id || order.book; // book is populated in approveRefundRequest
    await User.updateOne({ _id: order.user }, { $pull: { purchasedBooks: bookId } });
    return true;
  }
  return false;
};
// ---------- user: raise a request ----------
const createRefundRequest = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const details = String(req.body.details || "").trim();

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: "Please choose a valid reason" });
    }
    if (details.length < 10 || details.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Please describe the problem in 10 to 1000 characters.",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id }).populate("book", "title");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.type !== "book") {
      return res.status(400).json({
        success: false,
        message: "Subscriptions are not refundable. Only book purchases can be refunded.",
      });
    }

    if (order.status !== "paid") {
      return res.status(400).json({ success: false, message: "Only paid orders can be refunded." });
    }
    if (!order.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing for this order. Please contact support.",
      });
    }
    const boughtAt = order.accessGrantedAt || order.createdAt;
    if (Date.now() - new Date(boughtAt).getTime() > REFUND_REQUEST_DAYS * DAY_MS) {
      return res.status(400).json({
        success: false,
        message: `Refund requests must be made within ${REFUND_REQUEST_DAYS} days of purchase.`,
      });
    }

    // A rejected request may be sent ONE more time (for example with better
    // proof). Anything else already on file blocks a new request.
    let request;
    const previous = await RefundRequest.findOne({ order: order._id });
    if (previous) {
      if (previous.status !== "rejected" || (previous.resubmitCount || 0) >= 1) {
        return res.status(409).json({
          success: false,
          message:
            previous.status === "rejected"
              ? "This refund request was already reviewed and sent again once. Please contact support."
              : "A refund request already exists for this order.",
        });
      }
      previous.reason = reason;
      previous.details = details;
      previous.status = "pending";
      previous.resubmitCount = (previous.resubmitCount || 0) + 1;
      previous.decidedAt = null;
      previous.decidedBy = null;
      previous.adminNote = "";
      request = await previous.save();
    } else {
      request = await RefundRequest.create({
        user: req.user._id,
        order: order._id,
        reason,
        details,
      });
    }

    // Acknowledge to the customer (the policy promises an acknowledgement)
    safeMail({
      to: req.user.email,
      subject: "We received your refund request",
      text: [
        `Hi ${req.user.name || "there"},`,
        "",
        `We have received your refund request for: ${itemName(order)}.`,
        `Order ID: ${order.razorpayOrderId}`,
        "",
        "Our team will review it and reply by email. You can follow the status in My Purchases.",
        "",
        "SAFAR EBOOKS Support",
      ].join("\n"),
    });
    // Tell the admin inbox
    if (process.env.EMAIL_USER) {
      safeMail({
        to: process.env.EMAIL_USER,
        subject: "New refund request",
        text: `${req.user.email} requested a refund for ${itemName(order)} (₹${order.amount}).\nReason: ${reason}\n${details}\n\nReview it in Admin > Refund Requests.`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Refund request sent. We'll email you after we review it.",
      request,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A refund request already exists for this order.",
      });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- user: my requests ----------
const getMyRefundRequests = async (req, res) => {
  try {
    const refunds = await RefundRequest.find({ user: req.user._id })
      .select("order status reason adminNote refundAmount accessRevoked createdAt decidedAt")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, refunds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- admin: list ----------
// ---------- admin: list ----------
const getAdminRefundRequests = async (req, res) => {
  try {
    const allowed = ["pending", "processing", "approved", "rejected"];
    const filter = allowed.includes(req.query.status) ? { status: req.query.status } : {};

    const [found, pendingCount] = await Promise.all([
      RefundRequest.find(filter)
        .sort({ createdAt: -1 })
        .limit(300)
        .populate("user", "name email")
        .populate({
          path: "order",
          select: "type amount refundedAmount status plan billingCycle razorpayPaymentId createdAt book",
          populate: { path: "book", select: "title" },
        }),
      RefundRequest.countDocuments({ status: "pending" }),
    ]);

    // Attach how much of the book each customer has read
    const requests = found.map((r) => r.toObject());
    const pairs = requests
      .filter((r) => r.user?._id && r.order?.book?._id)
      .map((r) => ({ user: r.user._id, book: r.order.book._id }));

    if (pairs.length) {
      const history = await ReadingHistory.find({ $or: pairs }).select(
        "user book percentage currentPage totalPages"
      );
      const best = new Map(); // highest progress across language editions
      history.forEach((h) => {
        const key = `${h.user}_${h.book}`;
        const prev = best.get(key);
        if (!prev || h.percentage > prev.percentage) best.set(key, h);
      });
      requests.forEach((r) => {
        const h = best.get(`${r.user?._id}_${r.order?.book?._id}`);
        r.reading = h
          ? { percentage: h.percentage, currentPage: h.currentPage, totalPages: h.totalPages }
          : null;
      });
    }

    res.status(200).json({ success: true, requests, pendingCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- admin: just the number of pending requests (sidebar badge) ----------
const getPendingRefundCount = async (req, res) => {
  try {
    const count = await RefundRequest.countDocuments({ status: "pending" });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- admin: approve = refund through Razorpay + (optionally) remove access ----------
const approveRefundRequest = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid request id" });
  }

  // Lock the request so a double click can't send two refunds.
  const claimed = await RefundRequest.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "processing" } },
    { new: true }
  );
  if (!claimed) {
    return res.status(409).json({ success: false, message: "This request was already handled." });
  }

  let refundSent = false;
  try {
    const order = await Order.findById(claimed.order).populate("book", "title");
    const release = () => RefundRequest.updateOne({ _id: id }, { $set: { status: "pending" } });

    if (!order || !order.razorpayPaymentId) {
      await release();
      return res.status(400).json({ success: false, message: "Order or payment ID not found." });
    }

    const alreadyRefunded = order.refundedAmount || 0;
    const maxRefundable = Math.round((order.amount - alreadyRefunded) * 100) / 100;
    if (maxRefundable <= 0) {
      await release();
      return res.status(400).json({ success: false, message: "This order is already fully refunded." });
    }

    const raw = req.body.amount;
    const refundRupees =
      raw === undefined || raw === null || raw === ""
        ? maxRefundable
        : Math.round(Number(raw) * 100) / 100;

    if (!Number.isFinite(refundRupees) || refundRupees <= 0 || refundRupees > maxRefundable) {
      await release();
      return res.status(400).json({
        success: false,
        message: `Enter an amount greater than 0 and at most ₹${maxRefundable}.`,
      });
    }

    const paise = Math.round(refundRupees * 100);
    const isFull = Math.round((alreadyRefunded + refundRupees) * 100) >= Math.round(order.amount * 100);

    let refund;
    try {
      refund = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: paise,
        speed: "normal",
        notes: { refundRequestId: String(claimed._id), orderId: String(order._id) },
      });
      refundSent = true;
    } catch (err) {
      await release();
      const msg = err?.error?.description || err?.message || "Razorpay rejected the refund.";
      return res.status(502).json({
        success: false,
        message: `Razorpay could not process the refund: ${msg}`,
      });
    }

    // ---- from here the money HAS been sent: never put the request back to "pending" ----
    const wantsRevoke = req.body.revokeAccess !== false && req.body.revokeAccess !== "false";
    const note = String(req.body.adminNote || "").trim().slice(0, 500);
    let accessRevoked = false;
    try {
      if (wantsRevoke && isFull) accessRevoked = await revokeAccess(order);
    } catch (e) {
      console.error("[refunds] revoke failed:", e);
    }

    await RefundRequest.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status: "approved",
          decidedBy: req.user._id,
          decidedAt: new Date(),
          adminNote: note,
          refundAmount: refundRupees,
          razorpayRefundId: refund.id,
          accessRevoked,
        },
      }
    );
        // Update the order right away (no webhook needed)
    await Order.updateOne(
      { _id: order._id, refundIds: { $ne: refund.id } },
      {
        $push: { refundIds: refund.id },
        $inc: { refundedAmount: refundRupees },
        $set: {
          refundedAt: new Date(),
          ...(isFull ? { status: "refunded" } : {}),
        },
      }
    );

    const customer = await User.findById(order.user).select("name email");
    if (customer?.email) {
      safeMail({
        to: customer.email,
        subject: "Your refund has been approved",
        text: [
          `Hi ${customer.name || "there"},`,
          "",
          `Your refund request for ${itemName(order)} was approved.`,
          `Refund amount: ₹${refundRupees}`,
          "It goes back to your original payment method and usually appears in 5 to 7 business days.",
          accessRevoked ? "Access to this item has been removed from your account." : "",
          note ? `\nNote from our team: ${note}` : "",
          "",
          "SAFAR EBOOKS Support",
        ].join("\n"),
      });
    }

    res.status(200).json({
      success: true,
      message: `Refund of ₹${refundRupees} sent.${accessRevoked ? " Access removed." : ""}${
        wantsRevoke && !isFull ? " (Access kept because this was a partial refund.)" : ""
      }`,
    });
  } catch (error) {
    console.error(error);
    if (!refundSent) {
      await RefundRequest.updateOne({ _id: id, status: "processing" }, { $set: { status: "pending" } });
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    // Money was sent but a later step failed: do NOT retry — check Razorpay + Orders.
    res.status(200).json({
      success: true,
      message: "Refund was sent, but some follow-up steps failed. Please check Orders & Payments.",
    });
  }
};

// ---------- admin: reject ----------
const rejectRefundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request id" });
    }
    const note = String(req.body.adminNote || "").trim().slice(0, 500);
    if (note.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please give the customer a reason (at least 5 characters).",
      });
    }

    const doc = await RefundRequest.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "rejected", decidedBy: req.user._id, decidedAt: new Date(), adminNote: note } },
      { new: true }
    )
      .populate("user", "name email")
      .populate({ path: "order", populate: { path: "book", select: "title" } });

    if (!doc) {
      return res.status(409).json({ success: false, message: "This request was already handled." });
    }

    if (doc.user?.email) {
      safeMail({
        to: doc.user.email,
        subject: "About your refund request",
        text: [
          `Hi ${doc.user.name || "there"},`,
          "",
          `We reviewed your refund request for ${itemName(doc.order)} and could not approve it.`,
          `Reason: ${note}`,
          "",
          "If you think this is a mistake, reply to this email or contact us from the website.",
          "",
          "SAFAR EBOOKS Support",
        ].join("\n"),
      });
    }

    res.status(200).json({ success: true, message: "Request rejected and the customer was emailed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createRefundRequest,
  getMyRefundRequests,
  getAdminRefundRequests,
  getPendingRefundCount,
  approveRefundRequest,
  rejectRefundRequest,
};