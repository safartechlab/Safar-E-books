const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const Book = require("../models/Book");
const User = require("../models/User");
const { getPlanPrice } = require("../config/plans");
const RefundRequest = require("../models/RefundRequest");
const transporter = require("../config/email");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ABANDONED_ORDER_MINUTES = 60;

const sendPurchaseReceipt = async (order) => {
  const user = await User.findById(order.user).select("name email subscriptionExpiry");
  if (!user?.email) return;

  let item;
  if (order.type === "book") {
    const b = await Book.findById(order.book).select("title");
    item = b?.title || "E-book";
  } else {
    const plan = order.plan ? order.plan[0].toUpperCase() + order.plan.slice(1) : "Premium";
    item = `SAFAR EBOOKS ${plan} subscription${order.billingCycle ? ` (${order.billingCycle})` : ""}`;
  }

  const lines = [
    `Hi ${user.name || "there"},`,
    "",
    "Thank you for your purchase on SAFAR EBOOKS. Here is your receipt:",
    "",
    `Item: ${item}`,
    `Amount paid: ₹${order.amount}`,
    `Order ID: ${order.razorpayOrderId}`,
    order.razorpayPaymentId ? `Payment ID: ${order.razorpayPaymentId}` : "",
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
  ];
  if (order.type === "subscription" && user.subscriptionExpiry) {
    lines.push(`Subscription valid until: ${new Date(user.subscriptionExpiry).toLocaleDateString("en-IN")}`);
  }
  lines.push(
    "",
    "Need help or want to request a refund? Open My Purchases on the website.",
    "",
    "SAFAR EBOOKS"
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Your SAFAR EBOOKS payment receipt",
    text: lines.filter((l) => l !== undefined).join("\n"),
  });
};

const createOrder = async (req, res) => {
  try {
    const { type, bookId, plan, billingCycle } = req.body;

    if (type !== "book" && type !== "subscription") {
      return res.status(400).json({ success: false, message: "Invalid order type" });
    }

    const staleCutoff = new Date(Date.now() - ABANDONED_ORDER_MINUTES * 60 * 1000);
    await Order.updateMany(
      { user: req.user._id, status: "pending", createdAt: { $lt: staleCutoff } },
      { $set: { status: "failed" } }
    );

    let amount;
    let book = null;
    let planInfo = null; 

    if (type === "book") {
      if (!bookId) {
        return res.status(400).json({ success: false, message: "bookId is required" });
      }
      book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }
      if (book.isArchived) {
        return res.status(400).json({ success: false, message: "This book is no longer available for purchase." });
      }
      const hasReadableFile = (book.editions || []).some((e) => e.pdfUrl) || Boolean(book.pdfUrl);
      if (!hasReadableFile) {
        return res.status(400).json({
          success: false,
          message: "This book's file is not uploaded yet, so it can't be bought right now.",
        });
      }
      if (book.isFree) {
        return res.status(400).json({ success: false, message: "This book is free — no payment needed" });
      }
      if (book.isSubscriptionRequired) {
        return res.status(400).json({
          success: false,
          message: "This book requires a subscription, not a one-time purchase. Visit the Pricing page to subscribe.",
        });
      }
      if (!book.price || book.price <= 0) {
        return res.status(400).json({ success: false, message: "This book doesn't have a valid price set" });
      }
      if (req.user.purchasedBooks.some((id) => id.toString() === bookId)) {
        return res.status(400).json({ success: false, message: "You already own this book" });
      }
      amount = book.price;
    } else {

      planInfo = getPlanPrice(plan, billingCycle);
      if (!planInfo) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan or billing cycle",
        });
      }

      if (req.user.isSubscribed && req.user.subscriptionExpiry && req.user.subscriptionExpiry > new Date()) {
        return res.status(400).json({
          success: false,
          message: "You already have an active subscription.",
        });
      }
      amount = planInfo.amount;
    }

    const dedupQuery =
      type === "book"
        ? { user: req.user._id, type: "book", book: bookId, status: "pending" }
        : { user: req.user._id, type: "subscription", plan, billingCycle, status: "pending" };

    let existingOrder = await Order.findOne(dedupQuery);

    if (existingOrder && Number(existingOrder.amount) !== Number(amount)) {
      await Order.updateOne(
        { _id: existingOrder._id, accessGrantedAt: null },
        { $set: { status: "failed" } }
      );
      existingOrder = null;
    }
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        orderId: existingOrder.razorpayOrderId,
        amount: Math.round(existingOrder.amount * 100),
        currency: existingOrder.currency,
        dbOrderId: existingOrder._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        reused: true,
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      payment_capture: 1,
      receipt: `receipt_${Date.now()}`,
    });

    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        type,
        book: type === "book" ? bookId : null,
        plan: type === "subscription" ? plan : null,
        billingCycle: type === "subscription" ? billingCycle : null,
        amount,
        razorpayOrderId: razorpayOrder.id,
        status: "pending",
      });
    } catch (err) {

      if (err.code === 11000) {
        const raceOrder = await Order.findOne(dedupQuery);
        if (raceOrder) {
          return res.status(200).json({
            success: true,
            orderId: raceOrder.razorpayOrderId,
            amount: Math.round(raceOrder.amount * 100),
            currency: raceOrder.currency,
            dbOrderId: raceOrder._id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            reused: true,
          });
        }
      }
      throw err;
    }

    res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: order._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID, // safe to expose, it's the public key
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Could not create order" });
  }
};

const grantAccessForOrder = async (order, { paymentId, paidAmountPaise } = {}) => {
  if (order.accessGrantedAt) return; 

    if (typeof paidAmountPaise === "number") {
    const expectedPaise = Math.round(order.amount * 100);
    if (paidAmountPaise !== expectedPaise) {
      console.error(
        `[payments] amount mismatch for order ${order._id} (razorpay ${order.razorpayOrderId}): ` +
        `expected ${expectedPaise} paise, captured ${paidAmountPaise} paise. Access NOT granted — needs manual review.`
      );
      await Order.updateOne(
        { _id: order._id, accessGrantedAt: null, reviewedAt: null },
        {
          $set: {
            needsReview: true,
            reviewReason: `Amount mismatch: order is ₹${order.amount} but Razorpay captured ₹${paidAmountPaise / 100}. Access was NOT granted.`,
            ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
          },
        }
      );
      return;
    }
  }

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, accessGrantedAt: null },
    {
      $set: {
        status: "paid",
        accessGrantedAt: new Date(),
        ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
      },
    },
    { new: true }
  );

  if (!claimed) return;

  if (claimed.type === "book") {
    await User.findByIdAndUpdate(claimed.user, {
      $addToSet: { purchasedBooks: claimed.book },
    });
  } else if (claimed.type === "subscription") {
   
    const planInfo = getPlanPrice(claimed.plan, claimed.billingCycle);
    const durationDays = planInfo?.durationDays || Number(process.env.SUBSCRIPTION_DURATION_DAYS) || 30;

    const user = await User.findById(claimed.user);
    if (user) {

      const base =
        user.isSubscribed && user.subscriptionExpiry && user.subscriptionExpiry > new Date()
          ? user.subscriptionExpiry.getTime()
          : Date.now();
      const expiry = new Date(base + durationDays * 24 * 60 * 60 * 1000);

      user.isSubscribed = true;
      user.subscriptionExpiry = expiry;
      if (claimed.plan) user.subscriptionPlan = claimed.plan;
      if (claimed.billingCycle) user.subscriptionCycle = claimed.billingCycle;
      await user.save();
    }
  }

  sendPurchaseReceipt(claimed).catch((e) =>
    console.error("[payments] receipt email failed:", e.message)
  );
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const receivedBuf = Buffer.from(String(razorpay_signature), "utf8");
    const signatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!signatureValid) {
      console.warn("[payments] signature mismatch", {
        razorpayOrderId: razorpay_order_id,
        userId: req.user?._id,
        ip: req.ip,
      });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "This order does not belong to you" });
    }

    if (order.status === "paid" && order.accessGrantedAt) {
      return res.status(200).json({ success: true, message: "Payment already verified" });
    }

    let paidAmountPaise;
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      paidAmountPaise = payment.amount;
    } catch (fetchErr) {
      console.error("[payments] could not fetch payment from Razorpay for verification:", fetchErr.message);
    }

    await grantAccessForOrder(order, { paymentId: razorpay_payment_id, paidAmountPaise });

    const refreshedOrder = await Order.findById(order._id);
    if (!refreshedOrder.accessGrantedAt) {
      return res.status(400).json({
        success: false,
        message: "Payment could not be verified against the order amount. Contact support.",
      });
    }

    res.status(200).json({ success: true, message: "Payment verified, access granted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Payment verification error" });
  }
};

const handleRefundProcessed = async (refund) => {
  if (!refund?.id || !refund.payment_id) return;

  const order = await Order.findOne({ razorpayPaymentId: refund.payment_id });
  if (!order) {
    console.error(`[payments] refund ${refund.id} for unknown payment ${refund.payment_id}`);
    return;
  }

  const refundRupees = (refund.amount || 0) / 100;

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, refundIds: { $ne: refund.id } },
    {
      $push: { refundIds: refund.id },
      $inc: { refundedAmount: refundRupees },
      $set: { refundedAt: new Date() },
    },
    { new: true }
  );
  if (!updated) return;

  const isFull = Math.round(updated.refundedAmount * 100) >= Math.round(updated.amount * 100);

   const handledInApp = await RefundRequest.exists({
    order: updated._id,
    status: { $in: ["processing", "approved"] },
  });

  let autoRevoked = false;
  if (!handledInApp && isFull && updated.type === "book" && updated.book) {
    await User.updateOne(
      { _id: updated.user },
      { $pull: { purchasedBooks: updated.book } }
    );
    autoRevoked = true;
  }

  await Order.updateOne(
    { _id: updated._id },
    {
      $set: {
        ...(isFull ? { status: "refunded" } : {}),
        ...(handledInApp || autoRevoked
          ? {}
          : {
              needsReview: true,
              reviewedAt: null,
              reviewReason: `${isFull ? "Full" : "Partial"} refund of ₹${refundRupees} issued. The customer still has access — decide whether to revoke it.`,
            }),
      },
    }
  );
};

const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook");
      return res.status(500).json({ success: false, message: "Webhook not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const receivedBuf = Buffer.from(String(signature || ""), "utf8");
    const signatureValid =
      Boolean(signature) &&
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!signatureValid) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = payload.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const order = await Order.findOne({ razorpayOrderId });
        if (order) {
          await grantAccessForOrder(order, {
            paymentId: razorpayPaymentId,
            paidAmountPaise: paymentEntity?.amount,
          });
        }
      }
    }
        else if (event === "payment.failed") {
      const p = payload.payload?.payment?.entity;
      if (p?.order_id) {

        await Order.updateOne(
          { razorpayOrderId: p.order_id, status: "pending", accessGrantedAt: null },
          {
            $set: {
              status: "failed",
              failureReason: String(p.error_description || p.error_reason || "Payment failed").slice(0, 300),
              ...(p.id ? { razorpayPaymentId: p.id } : {}),
            },
          }
        );
      }
      } else if (event === "refund.processed") {
      await handleRefundProcessed(payload.payload?.refund?.entity);
    } else if (event === "refund.failed") {
      const failedRefund = payload.payload?.refund?.entity;
      if (failedRefund?.payment_id) {
        await Order.updateOne(
          { razorpayPaymentId: failedRefund.payment_id },
          {
            $set: {
              needsReview: true,
              reviewedAt: null,
              reviewReason: `Refund ${failedRefund.id} FAILED at Razorpay — the customer has NOT been refunded. Retry it from the Razorpay Dashboard.`,
            },
          }
        );
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Webhook processing error" });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isSubscribed) {
      return res.status(400).json({ success: false, message: "No active subscription found" });
    }

    user.autoRenew = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Renewal reminders turned off. Your current plan stays active until it expires.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Could not cancel subscription" });
  }
};

const setAutoRenew = async (req, res) => {
  try {
    const { autoRenew } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.autoRenew = Boolean(autoRenew);
    await user.save();

    res.status(200).json({
      success: true,
      message: `Auto-renew ${user.autoRenew ? "enabled" : "disabled"}`,
      autoRenew: user.autoRenew,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Could not update auto-renew status" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("book", "title coverImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getMyOrders,
  razorpayWebhook,
  cancelSubscription,
  setAutoRenew,
  grantAccessForOrder,
};