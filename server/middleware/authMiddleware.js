const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isMobileOrTabletRequest, ADMIN_DESKTOP_ONLY_MESSAGE } = require("../utils/deviceCheck");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password -otp -otpExpiry");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    const sessionStillValid = (user.activeSessions || []).some((s) => s.tokenId === decoded.sid);
    if (!sessionStillValid) {
      return res.status(401).json({
        success: false,
        message: "You've been signed out because your account reached its device limit on another device.",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by the administrator.",
      });
    }

    req.user = user;
    req.sessionId = decoded.sid;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired token",
    });
  }
};

const attachUserIfPresent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -otp -otpExpiry");

    if (user && user.status !== "blocked") {
      const sessionStillValid = (user.activeSessions || []).some((s) => s.tokenId === decoded.sid);
      if (sessionStillValid) req.user = user;
    }
  } catch (error) {

  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {

    if (isMobileOrTabletRequest(req)) {
      return res.status(403).json({
        success: false,
        adminDeviceBlocked: true,
        message: ADMIN_DESKTOP_ONLY_MESSAGE,
      });
    }
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: admin only",
  });
};

module.exports = { protect, adminOnly, attachUserIfPresent };