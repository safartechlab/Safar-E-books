const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");

const { getDashboardData } = require("../controllers/dashboardController");

router.get("/", protect, adminOnly, getDashboardData);

module.exports = router;