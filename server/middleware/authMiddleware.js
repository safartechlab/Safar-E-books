const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isMobileOrTabletRequest, ADMIN_DESKTOP_ONLY_MESSAGE } = require("../utils/deviceCheck");

// ==========================
// Protect: verifies the JWT and attaches the user to req.user
// ==========================
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

    // Fetch the user fresh from DB (so blocked/deleted users are caught immediately)
    const user = await User.findById(decoded.id).select("-password -otp -otpExpiry");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    // Device-limit enforcement: if this token's session was evicted
    // (because the account logged in on more devices than its plan
    // allows), it won't be in activeSessions anymore — treat that the
    // same as an expired token so the client's 401 handler logs it out.
    // (|| [] guards accounts that predate this field.)
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

    req.user = user; // available in every controller from here on
    req.sessionId = decoded.sid; // used by logoutUser to remove just this device's session
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired token",
    });
  }
};

// ==========================
// attachUserIfPresent: for routes that must stay public (e.g. the book
// catalog) but behave slightly differently for a logged-in admin (e.g.
// seeing archived books). Never blocks the request — a missing, invalid,
// or expired token just means req.user stays undefined, same as an
// anonymous visitor.
// ==========================
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
    // Any failure here just means "treat as anonymous" — never respond
    // with an error from an optional-auth middleware.
  }
  next();
};

// ==========================
// adminOnly: must run AFTER protect
// ==========================
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    // Admin tools are laptop/desktop only (see utils/deviceCheck.js).
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