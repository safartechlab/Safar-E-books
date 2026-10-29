const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const { PLANS } = require("../config/plans");

const STATUS_FILTERS = {
  paid: { status: "paid" },
  pending: { status: "pending" },
  failed: { status: "failed" },
  // includes partial refunds (status stays "paid" for those)
  refunded: { $or: [{ status: "refunded" }, { refundedAmount: { $gt: 0 } }] },
  review: { needsReview: true },
};

const MAX_EXPORT_ROWS = 10000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Parse "YYYY-MM-DD" into a Date (start or end of that day, server time).
const parseDay = (value, endOfDay) => {
  if (!YMD.test(value)) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Shared by the list and the CSV export so they always match.
// Returns { filter } or { error }.
const buildOrderFilter = async (query) => {
  const and = [];

  if (STATUS_FILTERS[query.status]) and.push(STATUS_FILTERS[query.status]);
  if (["book", "subscription"].includes(query.type)) and.push({ type: query.type });

  // Date range (inclusive, based on order creation date)
  const from = query.from ? parseDay(String(query.from), false) : null;
  const to = query.to ? parseDay(String(query.to), true) : null;

  if ((query.from && !from) || (query.to && !to)) {
    return { error: "Invalid date. Use the format YYYY-MM-DD." };
  }
  if (from && to && from > to) {
    return { error: "'From' date cannot be after 'To' date." };
  }
  if (from || to) {
    and.push({
      createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) },
    });
  }

  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
      .select("_id")
      .limit(50)
      .lean();
    and.push({
      $or: [
        { user: { $in: users.map((u) => u._id) } },
        { razorpayOrderId: rx },
        { razorpayPaymentId: rx },
      ],
    });
  }

  return { filter: and.length ? { $and: and } : {} };
};

// GET /api/payments/admin/orders?status=&type=&search=&from=&to=&page=&limit=
const getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));

    const { filter, error } = await buildOrderFilter(req.query);
    if (error) return res.status(400).json({ success: false, message: error });

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .populate("book", "title coverImage")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      orders,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---- CSV helpers ----
// Text cells: quote + escape quotes, and neutralise spreadsheet formulas
// (a cell starting with = + - @ could run as a formula when opened in Excel).
const csvText = (value) => {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const csvNum = (value) => (Number.isFinite(Number(value)) ? String(Number(value)) : "0");
const csvDate = (value) => (value ? new Date(value).toISOString() : "");

// GET /api/payments/admin/orders/export?status=&type=&search=&from=&to=
const exportAdminOrders = async (req, res) => {
  try {
    const { filter, error } = await buildOrderFilter(req.query);
    if (error) return res.status(400).json({ success: false, message: error });

    const total = await Order.countDocuments(filter);
    if (total > MAX_EXPORT_ROWS) {
      return res.status(400).json({
        success: false,
        message: `${total} orders match. Narrow the date range to ${MAX_EXPORT_ROWS} or fewer and try again.`,
      });
    }

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("book", "title")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Created At (UTC)",
      "Order ID",
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Customer Name",
      "Customer Email",
      "Type",
      "Item",
      "Plan",
      "Billing Cycle",
      "Amount",
      "Currency",
      "Status",
      "Refunded Amount",
      "Refunded At (UTC)",
      "Net Amount",
      "Needs Review",
      "Review Reason",
      "Review Note",
      "Failure Reason",
      "Access Granted At (UTC)",
    ];

    const rows = orders.map((o) => {
      const refunded = o.refundedAmount || 0;
      // Net = what you actually kept. Unpaid orders (pending/failed) are 0.
      const countsAsRevenue = o.status === "paid" || o.status === "refunded";
      const net = countsAsRevenue ? o.amount - refunded : 0;

      return [
        csvText(csvDate(o.createdAt)),
        csvText(o._id),
        csvText(o.razorpayOrderId),
        csvText(o.razorpayPaymentId),
        csvText(o.user?.name || "Deleted user"),
        csvText(o.user?.email || ""),
        csvText(o.type),
        csvText(o.type === "book" ? o.book?.title || "Book deleted" : "Subscription"),
        csvText(o.plan || ""),
        csvText(o.billingCycle || ""),
        csvNum(o.amount),
        csvText(o.currency || "INR"),
        csvText(o.status),
        csvNum(refunded),
        csvText(csvDate(o.refundedAt)),
        csvNum(net),
        csvText(o.needsReview ? "Yes" : "No"),
        csvText(o.reviewReason || ""),
        csvText(o.reviewNote || ""),
        csvText(o.failureReason || ""),
        csvText(csvDate(o.accessGrantedAt)),
      ].join(",");
    });

    // \uFEFF = BOM so Excel reads UTF-8 names correctly
    const csv = "\uFEFF" + [headers.map(csvText).join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Export failed" });
  }
};

// GET /api/payments/admin/summary
const getAdminOrderSummary = async (req, res) => {
  try {
    const [byStatus, revenueAgg, refundAgg, needsReview] = await Promise.all([
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $in: ["paid", "refunded"] } } },
        {
          $group: {
            _id: null,
            gross: { $sum: "$amount" },
            refunded: { $sum: "$refundedAmount" },
          },
        },
      ]),
      Order.aggregate([
        { $match: { refundedAmount: { $gt: 0 } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$refundedAmount" } } },
      ]),
      Order.countDocuments({ needsReview: true }),
    ]);

    const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    const gross = revenueAgg[0]?.gross || 0;
    const refundedTotal = revenueAgg[0]?.refunded || 0;

    res.status(200).json({
      success: true,
      summary: {
        paid: counts.paid || 0,
        pending: counts.pending || 0,
        failed: counts.failed || 0,
        refundedCount: refundAgg[0]?.count || 0,
        refundedAmount: refundAgg[0]?.amount || 0,
        needsReview,
        netRevenue: gross - refundedTotal,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PATCH /api/payments/admin/orders/:id/review   body: { note }
const markOrderReviewed = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const note = String(req.body?.note || "").trim().slice(0, 500);

    const order = await Order.findOneAndUpdate(
      { _id: id, needsReview: true },
      { $set: { needsReview: false, reviewedAt: new Date(), reviewNote: note } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not flagged for review",
      });
    }

    res.status(200).json({ success: true, message: "Marked as reviewed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ================= Revenue analytics =================
const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// GET /api/payments/admin/analytics?range=3|6|12|all
const getRevenueAnalytics = async (req, res) => {
  try {
    const range = ["3", "6", "12", "all"].includes(req.query.range) ? req.query.range : "12";
    const PAID = { status: { $in: ["paid", "refunded"] } };

    // Month indexes (year*12 + month) in IST
    const nowIst = new Date(Date.now() + IST_OFFSET_MS);
    const endIdx = nowIst.getUTCFullYear() * 12 + nowIst.getUTCMonth();

    let startIdx;
    if (range === "all") {
      const first = await Order.aggregate([
        { $match: PAID },
        { $group: { _id: null, first: { $min: { $ifNull: ["$accessGrantedAt", "$createdAt"] } } } },
      ]);
      if (first[0]?.first) {
        const f = new Date(first[0].first.getTime() + IST_OFFSET_MS);
        startIdx = f.getUTCFullYear() * 12 + f.getUTCMonth();
      } else {
        startIdx = endIdx;
      }
      startIdx = Math.max(startIdx, endIdx - 59); // chart shows at most 60 months
    } else {
      startIdx = endIdx - (Number(range) - 1);
    }

    const startDate =
      range === "all"
        ? null
        : new Date(Date.UTC(Math.floor(startIdx / 12), startIdx % 12, 1) - IST_OFFSET_MS);

    const [result] = await Order.aggregate([
      { $match: PAID },
      {
        $addFields: {
          // Use the date the payment was actually confirmed (falls back to
          // creation date for older orders without accessGrantedAt)
          paidAt: { $ifNull: ["$accessGrantedAt", "$createdAt"] },
          refunded: { $ifNull: ["$refundedAmount", 0] },
        },
      },
      ...(startDate ? [{ $match: { paidAt: { $gte: startDate } } }] : []),
      { $addFields: { hasRefund: { $cond: [{ $gt: ["$refunded", 0] }, 1, 0] } } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                gross: { $sum: "$amount" },
                refunded: { $sum: "$refunded" },
                refundedOrders: { $sum: "$hasRefund" },
              },
            },
          ],
          byMonth: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$paidAt", timezone: TZ } },
                orders: { $sum: 1 },
                gross: { $sum: "$amount" },
                refunded: { $sum: "$refunded" },
                book: {
                  $sum: { $cond: [{ $eq: ["$type", "book"] }, { $subtract: ["$amount", "$refunded"] }, 0] },
                },
                subscription: {
                  $sum: { $cond: [{ $eq: ["$type", "subscription"] }, { $subtract: ["$amount", "$refunded"] }, 0] },
                },
              },
            },
          ],
          byType: [
            {
              $group: {
                _id: "$type",
                orders: { $sum: 1 },
                gross: { $sum: "$amount" },
                refunded: { $sum: "$refunded" },
              },
            },
          ],
          byPlan: [
            { $match: { type: "subscription" } },
            {
              $group: {
                _id: { plan: "$plan", cycle: "$billingCycle" },
                orders: { $sum: 1 },
                gross: { $sum: "$amount" },
                refunded: { $sum: "$refunded" },
              },
            },
          ],
          topBooks: [
            { $match: { type: "book", book: { $ne: null } } },
            {
              $group: {
                _id: "$book",
                sales: { $sum: 1 },
                gross: { $sum: "$amount" },
                refunded: { $sum: "$refunded" },
              },
            },
            { $addFields: { net: { $subtract: ["$gross", "$refunded"] } } },
            { $sort: { sales: -1, net: -1 } },
            { $limit: 10 },
            { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "bookInfo" } },
            { $unwind: { path: "$bookInfo", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                bookId: "$_id",
                title: { $ifNull: ["$bookInfo.title", "Deleted book"] },
                author: { $ifNull: ["$bookInfo.author", ""] },
                sales: 1,
                gross: 1,
                refunded: 1,
                net: 1,
              },
            },
          ],
        },
      },
    ]);

    // ---- KPIs ----
    const t = result.totals[0] || {};
    const gross = round2(t.gross);
    const refunded = round2(t.refunded);
    const orders = t.orders || 0;
    const refundedOrders = t.refundedOrders || 0;
    const net = round2(gross - refunded);

    // ---- Monthly series (gap-free) ----
    const monthMap = Object.fromEntries(result.byMonth.map((m) => [m._id, m]));
    const byMonth = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const y = Math.floor(i / 12);
      const m = i % 12;
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const row = monthMap[key] || {};
      byMonth.push({
        key,
        label: `${MONTH_NAMES[m]} ${y}`,
        orders: row.orders || 0,
        gross: round2(row.gross),
        refunded: round2(row.refunded),
        net: round2((row.gross || 0) - (row.refunded || 0)),
        book: round2(row.book),
        subscription: round2(row.subscription),
      });
    }

    // ---- Books vs subscriptions ----
    const typeMap = Object.fromEntries(result.byType.map((r) => [r._id, r]));
    const byType = ["book", "subscription"].map((type) => {
      const r = typeMap[type] || {};
      const g = r.gross || 0;
      const rf = r.refunded || 0;
      return {
        type,
        label: type === "book" ? "Books" : "Subscriptions",
        orders: r.orders || 0,
        gross: round2(g),
        refunded: round2(rf),
        net: round2(g - rf),
        sharePct: pct(g - rf, net),
      };
    });

    // ---- Revenue per plan (every tier x cycle shown, even if 0) ----
    const planMap = {};
    result.byPlan.forEach((r) => {
      planMap[`${r._id.plan}|${r._id.cycle}`] = r;
    });
    const byPlan = [];
    Object.keys(PLANS).forEach((tier) => {
      ["monthly", "quarterly"].forEach((cycle) => {
        const r = planMap[`${tier}|${cycle}`] || {};
        byPlan.push({
          plan: tier,
          cycle,
          label: `${PLANS[tier].label} · ${cycle === "monthly" ? "Monthly" : "Quarterly"}`,
          orders: r.orders || 0,
          gross: round2(r.gross),
          refunded: round2(r.refunded),
          net: round2((r.gross || 0) - (r.refunded || 0)),
        });
      });
    });
    const legacy = planMap["null|null"];
    if (legacy) {
      byPlan.push({
        plan: "legacy",
        cycle: "",
        label: "Older orders (no plan)",
        orders: legacy.orders,
        gross: round2(legacy.gross),
        refunded: round2(legacy.refunded),
        net: round2(legacy.gross - legacy.refunded),
      });
    }

    res.status(200).json({
      success: true,
      range,
      kpis: {
        gross,
        refunded,
        net,
        orders,
        avgOrderValue: orders ? round2(gross / orders) : 0,
        refundedOrders,
        refundRateOrders: pct(refundedOrders, orders),
        refundRateAmount: pct(refunded, gross),
      },
      byMonth,
      byType,
      byPlan,
      topBooks: result.topBooks.map((b) => ({
        ...b,
        gross: round2(b.gross),
        refunded: round2(b.refunded),
        net: round2(b.net),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getAdminOrders,
  exportAdminOrders,
  getAdminOrderSummary,
  markOrderReviewed,
  getRevenueAnalytics,
};