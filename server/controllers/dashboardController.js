const Book = require("../models/Book");
const User = require("../models/User");
const Order = require("../models/Order");
const { PLANS } = require("../config/plans");

const getDashboardData = async (req, res) => {
  try {
    
    // Total Books
    const totalBooks = await Book.countDocuments();
    // Total Users
    const totalUsers = await User.countDocuments({
      role: "user",
    });
    // Total Categories
    const categories = await Book.distinct("category");
    // Total Reads
    const totalReadsAgg = await Book.aggregate([
  { $group: { _id: null, total: { $sum: "$readCount" } } },
]);
const totalReads = totalReadsAgg[0]?.total || 0;

    // Recently Added Books   
    const recentBooks = await Book.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title author category");
    
    // Books Per Category
    
    const booksPerCategory = await Book.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    
    // User Statistics
    
    const activeUsers = await User.countDocuments({
      role: "user",
      status: "active",
    });

    const blockedUsers = await User.countDocuments({
      role: "user",
      status: "blocked",
    });

        // ==========================
    // Revenue & Orders
    // ==========================
    const orderStatsAgg = await Order.aggregate([
  { $match: { status: "paid" } },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$amount" },
      totalOrders: { $sum: 1 },
      bookSalesCount: { $sum: { $cond: [{ $eq: ["$type", "book"] }, 1, 0] } },
      subscriptionCount: { $sum: { $cond: [{ $eq: ["$type", "subscription"] }, 1, 0] } },
    },
  },
]);
const { totalRevenue = 0, totalOrders = 0, bookSalesCount = 0, subscriptionCount = 0 } =
  orderStatsAgg[0] || {};

      const activeSubscribers = await User.countDocuments({
      isSubscribed: true,
      subscriptionExpiry: { $gt: new Date() },
    });

    // ==========================
    // Subscription plan breakdown — which of the 3 tiers × 2 billing
    // cycles are actually in use right now, among CURRENTLY active
    // subscribers (not historical orders, which would still count
    // people who've since cancelled or lapsed).
    // ==========================
    const TIERS = Object.keys(PLANS); // ["basic", "medium", "premium"]
    const CYCLES = ["monthly", "quarterly"];

    const planAgg = await User.aggregate([
  {
    $match: {
      isSubscribed: true,
      subscriptionExpiry: { $gt: new Date() },
      subscriptionPlan: { $ne: null },        // ✅ matches schema
    },
  },
  {
    $group: {
      _id: { tier: "$subscriptionPlan", cycle: "$subscriptionCycle" },  // ✅ matches schema
      count: { $sum: 1 },
    },
  },
]);

    // Build a lookup so every tier×cycle combo is present with a real
    // number (0 if unused) — keeps charts/tables on the frontend stable
    // instead of silently omitting empty categories.
    const planCounts = {};
    planAgg.forEach((row) => {
      const key = `${row._id.tier}|${row._id.cycle}`;
      planCounts[key] = row.count;
    });

    const subscriptionByPlan = [];
    TIERS.forEach((tier) => {
      CYCLES.forEach((cycle) => {
        subscriptionByPlan.push({
          tier,
          cycle,
          label: `${PLANS[tier].label} · ${cycle === "monthly" ? "Monthly" : "Quarterly"}`,
          count: planCounts[`${tier}|${cycle}`] || 0,
        });
      });
    });

    const subscriptionByTier = TIERS.map((tier) => ({
      tier,
      label: PLANS[tier].label,
      count: subscriptionByPlan
        .filter((row) => row.tier === tier)
        .reduce((sum, row) => sum + row.count, 0),
    }));

    const subscriptionByCycle = CYCLES.map((cycle) => ({
      cycle,
      label: cycle === "monthly" ? "Monthly" : "Quarterly",
      count: subscriptionByPlan
        .filter((row) => row.cycle === cycle)
        .reduce((sum, row) => sum + row.count, 0),
    }));

    // Revenue for the last 6 months, grouped by month
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const revenueByMonth = monthlyRevenue.map((m) => ({
      month: monthNames[m._id.month - 1],
      revenue: m.revenue,
    }));

    // Top 5 best-selling books
    const topBooksAgg = await Order.aggregate([
  { $match: { status: "paid", type: "book" } },
  { $group: { _id: "$book", sales: { $sum: 1 }, revenue: { $sum: "$amount" } } },
  { $sort: { sales: -1 } },
  { $limit: 5 },
  {
    $lookup: {
      from: "books",
      localField: "_id",
      foreignField: "_id",
      as: "bookInfo",
    },
  },
  { $unwind: { path: "$bookInfo", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      title: { $ifNull: ["$bookInfo.title", "Deleted Book"] },
      author: { $ifNull: ["$bookInfo.author", ""] },
      sales: 1,
      revenue: 1,
    },
  },
]);

const topBooks = topBooksAgg;
    // Response
    
        res.status(200).json({
      success: true,

      totalBooks,
      totalUsers,
      totalCategories: categories.length,
      totalReads,

      recentBooks,

      booksPerCategory,

      userStatistics: [
        {
          name: "Active Users",
          value: activeUsers,
        },
        {
          name: "Blocked Users",
          value: blockedUsers,
        },
      ],

      // New: revenue data
      totalRevenue,
      totalOrders,
      bookSalesCount,
      subscriptionCount,
      activeSubscribers,
      subscriptionByTier,
      subscriptionByCycle,
      subscriptionByPlan,
      revenueByMonth,
      topBooks,
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
  getDashboardData,
};