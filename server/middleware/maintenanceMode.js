const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSiteSettings } = require("../config/siteSettings");

// Paths (relative to /api) that must keep working during maintenance:
//  - settings/public: so the maintenance page can check if it's over
//  - auth/login: so an admin can sign in (non-admins are blocked inside loginUser)
//  - auth/logout: so people can still sign out
//  - health: so an uptime monitor can tell "in maintenance" from "server down"
const ALWAYS_ALLOWED = ["/settings/public", "/auth/login", "/auth/logout", "/health"];

const isAdminRequest = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role activeSessions");

    return Boolean(
      user &&
      user.role === "admin" &&
      (user.activeSessions || []).some((s) => s.tokenId === decoded.sid)
    );
  } catch (err) {
    return false;
  }
};

const maintenanceMode = async (req, res, next) => {
  try {
    const settings = await getSiteSettings();
    if (!settings.maintenanceMode) return next();

    if (ALWAYS_ALLOWED.includes(req.path)) return next();
    if (await isAdminRequest(req)) return next();

    return res.status(503).json({
      success: false,
      maintenance: true,
      message:
        settings.maintenanceMessage ||
        "SAFAR EBOOKS is under maintenance. Please check back soon.",
    });
  } catch (error) {
    // If the settings lookup itself fails, don't take the whole site down.
    console.error("[maintenance] check failed:", error.message);
    return next();
  }
};

module.exports = maintenanceMode;