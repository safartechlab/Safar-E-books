const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { loginLimiter, otpLimiter, otpEmailLimiter, registerLimiter } = require("../middleware/rateLimiter");

const {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  verifyOtp,
  verifySignupOtp,
  resendSignupOtp,   
  resetPassword,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getUserById,
  getUserSessions,
  forceLogoutUser,
  changePassword,
  updateUserProfile,
  deleteMyAccount,
} = require("../controllers/authController");

// Public routes
router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/forgot-password", otpLimiter, otpEmailLimiter, forgotPassword);
router.post("/verify-otp", otpLimiter, otpEmailLimiter, verifyOtp);
router.post("/verify-signup-otp", otpLimiter, otpEmailLimiter, verifySignupOtp);
router.post("/resend-signup-otp", otpLimiter, otpEmailLimiter, resendSignupOtp);
router.post("/reset-password", otpLimiter, otpEmailLimiter, resetPassword);

router.get("/users", protect, adminOnly, getAllUsers);
router.patch("/users/:id/status", protect, adminOnly, updateUserStatus);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.get("/users/:id/sessions", protect, adminOnly, getUserSessions);
router.post("/users/:id/force-logout", protect, adminOnly, forceLogoutUser);

router.get("/session", protect, (req, res) => {
  res.status(200).json({
    success: true,
    valid: true,

    user: {
      purchasedBooks: req.user.purchasedBooks || [],
      isSubscribed: Boolean(req.user.isSubscribed),
      subscriptionExpiry: req.user.subscriptionExpiry || null,
      subscriptionPlan: req.user.subscriptionPlan || null,
      subscriptionCycle: req.user.subscriptionCycle || null,
    },
  });
});
router.post("/logout", protect, logoutUser);
router.post("/change-password", protect, loginLimiter, changePassword);
router.delete("/me", protect, loginLimiter, deleteMyAccount);
router.get("/users/:id", protect, getUserById);
router.put("/users/:id", protect, updateUserProfile);

module.exports = router;