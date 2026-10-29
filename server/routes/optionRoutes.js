const express = require("express");
const router = express.Router();

const { protect, adminOnly, attachUserIfPresent } = require("../middleware/authMiddleware");
const {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
} = require("../controllers/optionController");

router.get("/", attachUserIfPresent, getOptions);

router.post("/", protect, adminOnly, createOption);
router.put("/:id", protect, adminOnly, updateOption);
router.delete("/:id", protect, adminOnly, deleteOption);

module.exports = router;