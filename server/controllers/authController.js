const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const transporter = require("../config/email");
const otpGenerator = require("otp-generator");
const { getDeviceLimitForUser } = require("../config/plans");
const { isMobileOrTabletRequest, ADMIN_DESKTOP_ONLY_MESSAGE } = require("../utils/deviceCheck");
const Review = require("../models/Review");
const Wishlist = require("../models/Wishlist");
const ReadingHistory = require("../models/ReadingHistory");
const { getSiteSettings } = require("../config/siteSettings");

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const otpMatches = (submitted, storedHash) => {
  if (!storedHash || !submitted) return false;
  const a = Buffer.from(hashOtp(submitted));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const MAX_OTP_ATTEMPTS = 5;

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const registerUser = async (req, res) => {
  try {

    const siteSettings = await getSiteSettings();
    if (siteSettings.signupsPaused) {
      return res.status(503).json({
        success: false,
        message: "New signups are temporarily paused. Please try again later.",
      });
    }

    const { name, email, password, gender } = req.body;

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password) ||
      !isNonEmptyString(gender)
    ) {
      return res.status(400).json({
        message: "Please fill all fields",
      });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({
        message: "Name must be at least 3 characters long",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    const genericResponse = {
      success: true,
      message: "Registration successful. Please check your email for the verification code.",
      email,
    };

    if (existingUser && existingUser.isVerified) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Someone tried to sign up with your SAFAR EBOOKS email",
        html: `
          <h2>Heads up</h2>
          <p>Someone just tried to create a new SAFAR EBOOKS account using this email address, which already has an account.</p>
          <p>If this was you, simply log in to your existing account instead.</p>
          <p>If it wasn't you, no action is needed — your account is safe and nothing has changed.</p>
        `,
      }).catch((err) => console.error("Notification email failed:", err));

      return res.status(201).json(genericResponse);
    }

    if (existingUser && !existingUser.isVerified) {
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      existingUser.name = name;
      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.gender = gender;
      existingUser.otp = hashOtp(otp);
      existingUser.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      existingUser.otpAttempts = 0;
      await existingUser.save();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your SAFAR EBOOKS account",
        html: `
          <h2>Welcome to SAFAR EBOOKS, ${escapeHtml(name)}!</h2>
          <p>Your verification code is:</p>
          <h1>${otp}</h1>
          <p>This code is valid for <b>5 minutes</b>.</p>
        `,
      });
      return res.status(201).json(genericResponse);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    await User.create({
      name,
      email,
      password: hashedPassword,
      gender,
      role: "user",
      isVerified: false,
      otp: hashOtp(otp),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your SAFAR EBOOKS account",
      html: `
        <h2>Welcome to SAFAR EBOOKS, ${escapeHtml(name)}!</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
        <p>This code is valid for <b>5 minutes</b>.</p>
      `,
    });

    res.status(201).json(genericResponse);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (user.role === "admin" && isMobileOrTabletRequest(req)) {
      return res.status(403).json({
        success: false,
        adminDeviceBlocked: true,
        message: ADMIN_DESKTOP_ONLY_MESSAGE,
      });
    }

    const siteSettings = await getSiteSettings();
    if (siteSettings.maintenanceMode && user.role !== "admin") {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message:
          siteSettings.maintenanceMessage ||
          "SAFAR EBOOKS is under maintenance. Please check back soon.",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by the administrator.",
      });
    }

    if (!user.isVerified) {
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      user.otp = hashOtp(otp);
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.otpAttempts = 0;
      await user.save();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Verify your SAFAR EBOOKS account",
        html: `
          <h2>Verify your account</h2>
          <p>Your new verification code is:</p>
          <h1>${otp}</h1>
          <p>This code is valid for <b>5 minutes</b>.</p>
        `,
      });

      return res.status(403).json({
        success: false,
        message: "Your account isn't verified yet. We've sent a new code to your email.",
        unverified: true,
        email: user.email,
      });
    }

    const sessionId = crypto.randomUUID();
    const deviceLabel = (req.headers["user-agent"] || "Unknown device").slice(0, 200);

    if (!Array.isArray(user.activeSessions)) {
      user.activeSessions = [];
    }

    user.activeSessions.push({ tokenId: sessionId, device: deviceLabel, createdAt: new Date() });

    const deviceLimit = getDeviceLimitForUser(user);
    if (user.activeSessions.length > deviceLimit) {
      user.activeSessions = user.activeSessions.slice(-deviceLimit);
    }
    await user.save();

    const remember = rememberMe === true || rememberMe === "true";

const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
    sid: sessionId,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: remember ? "30d" : "1d",
  }
);

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      isSubscribed: user.isSubscribed,
      subscriptionExpiry: user.subscriptionExpiry,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionCycle: user.subscriptionCycle,
      purchasedBooks: user.purchasedBooks,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isNonEmptyString(email)) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    const genericResponse = {
      success: true,
      message: "If that email is registered, an OTP has been sent to it.",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
 
    user.otp = hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + 2 * 60 * 1000);
    user.otpAttempts = 0;

    await user.save();

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "SAFAR EBOOKS Password Reset OTP",
      html: `
        <h2>SAFAR EBOOKS</h2>
        <p>Your OTP for password reset is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for <b>2 minutes</b>.</p>
      `,
    });

    res.status(200).json(genericResponse);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(otp)) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");
    if (!user) {

      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please resend OTP.",
      });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      user.otp = "";
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }
    if (!otpMatches(otp, user.otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.otp = "";
    user.otpExpiry = null;
    user.otpAttempts = 0;

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP Verified Successfully",
      resetToken: rawResetToken,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(otp)) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");

    const invalidOtpResponse = {
      success: false,
      message: "Invalid or expired OTP",
    };

    if (!user) {
      return res.status(400).json(invalidOtpResponse);
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified",
      });
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json(invalidOtpResponse);
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      user.otp = "";
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (!otpMatches(otp, user.otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json(invalidOtpResponse);
    }

    user.isVerified = true;
    user.otp = "";
    user.otpExpiry = null;
    user.otpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isNonEmptyString(email)) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    const genericResponse = {
      success: true,
      message: "If there's a pending signup for that email, a new code has been sent.",
    };
    if (!user || user.isVerified) {
      return res.status(200).json(genericResponse);
    }
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    user.otp = hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your new SAFAR EBOOKS verification code",
      html: `
        <h2>Here's your new code</h2>
        <h1>${otp}</h1>
        <p>This code is valid for <b>5 minutes</b>.</p>
      `,
    });
    res.status(200).json(genericResponse);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, resetToken } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(resetToken)) {
      return res.status(400).json({
        message: "Email, reset token and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findOne({ email }).select("+resetToken +resetTokenExpiry");
    if (!user) {

      return res.status(400).json({
        success: false,
        message: "Reset session has expired. Please verify the OTP again.",
      });
    }

    if (!user.resetToken || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Reset session has expired. Please verify the OTP again.",
      });
    }
    const hashedIncomingToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  
    const providedBuf = Buffer.from(hashedIncomingToken);
    const storedBuf = Buffer.from(user.resetToken);
    const tokenMatches =
      providedBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(providedBuf, storedBuf);

    if (!tokenMatches) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    user.otp = "";
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.activeSessions = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (status !== "active" && status !== "blocked") {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'blocked'",
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }


    if (targetUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts can't be blocked from here.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password -otp -otpExpiry -activeSessions");

    res.status(200).json({
      success: true,
      message: "User status updated",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts can't be deleted from here.",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    const cleanup = await Promise.allSettled([
      Review.deleteMany({ user: req.params.id }),
      Wishlist.deleteMany({ user: req.params.id }),
      ReadingHistory.deleteMany({ user: req.params.id }),
    ]);

    cleanup.forEach((result, i) => {
      if (result.status === "rejected") {
        const label = ["reviews", "wishlist", "reading history"][i];
        console.error(`Failed to clean up ${label} for deleted user ${req.params.id}:`, result.reason);
      }
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry -activeSessions")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const sessions = [...(user.activeSessions || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((s) => ({ device: s.device, createdAt: s.createdAt }));

    const deviceLimit = getDeviceLimitForUser(user);

    res.status(200).json({
      success: true,

      deviceLimit: deviceLimit === Infinity ? null : deviceLimit,
      sessionCount: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const forceLogoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.activeSessions = [];
    await user.save();

    const deviceLimit = getDeviceLimitForUser(user);

    res.status(200).json({
      success: true,
      message: "User has been logged out of all devices",
      deviceLimit: deviceLimit === Infinity ? null : deviceLimit,
      sessionCount: 0,
      sessions: [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getUserById = async (req, res) => {
  try {

    if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(req.params.id).select("-password -activeSessions");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }
    user.password = await bcrypt.hash(newPassword, 10);
  
    user.activeSessions = (user.activeSessions || []).filter(
      (s) => s.tokenId === req.sessionId
    );

    await user.save();
    res.status(200).json({
      success: true,
      message: "Password changed successfully. You've been logged out of any other devices.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
const updateUserProfile = async (req, res) => {
  try {

    if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { name } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 3 characters long",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -otp -otpExpiry -activeSessions");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    if (req.sessionId) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { activeSessions: { tokenId: req.sessionId } },
      });
    }
    res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (!password) {
      return res.status(400).json({ success: false, message: "Please enter your password to confirm." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Admin accounts can't be deleted from here." });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return res.status(401).json({ success: false, message: "Incorrect password." });

    await User.findByIdAndDelete(user._id);

    await Promise.allSettled([
      Review.deleteMany({ user: user._id }),
      Wishlist.deleteMany({ user: user._id }),
      ReadingHistory.deleteMany({ user: user._id }),
    ]);

    res.status(200).json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  verifyOtp,
  verifySignupOtp,
  resendSignupOtp,
  resetPassword,
  updateUserStatus,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserSessions,
  forceLogoutUser,
  changePassword,
  updateUserProfile,
  deleteMyAccount,
};