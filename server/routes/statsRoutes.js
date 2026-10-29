const express = require("express");
const router = express.Router();
const { getPublicStats } = require("../controllers/statsController");

// Public: used by the About page
router.get("/", getPublicStats);

module.exports = router;