const rateLimit = require("express-rate-limit");

// Per-email limiter for OTP-related routes — supplements (doesn't
// replace) the per-IP otpLimiter below. Without this, everyone behind
// the same IP (office Wi-Fi, campus network, mobile carrier NAT) shares
// one 5-per-10-minutes budget; a targeted attacker could also just
// rotate IPs to keep hammering a single victim's inbox. Simple in-memory
// store — fine for a single server instance; move to Redis if this ever
// runs on more than one instance.
const otpAttemptsByEmail = new Map(); // email -> { count, windowStart }
const OTP_EMAIL_WINDOW_MS = 10 * 60 * 1000;
// Each step has its OWN budget per email, so a normal "forgot password" trip
// (ask for code -> type code -> set new password) never uses up another step.
const OTP_EMAIL_MAX_BY_PATH = {
  "/forgot-password": 5,
  "/resend-signup-otp": 5,
  "/verify-otp": 10,
  "/verify-signup-otp": 10,
  "/reset-password": 10,
};
const OTP_EMAIL_MAX_DEFAULT = 5;

// Forget old entries so this Map never grows forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpAttemptsByEmail) {
    if (now - entry.windowStart > OTP_EMAIL_WINDOW_MS) otpAttemptsByEmail.delete(key);
  }
}, 10 * 60 * 1000).unref();

const otpEmailLimiter = (req, res, next) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return next(); // let the route's own validation reject a missing email

  const now = Date.now();
  const key = `${req.path}|${email}`;
  const max = OTP_EMAIL_MAX_BY_PATH[req.path] || OTP_EMAIL_MAX_DEFAULT;
  const entry = otpAttemptsByEmail.get(key);

  if (!entry || now - entry.windowStart > OTP_EMAIL_WINDOW_MS) {
    otpAttemptsByEmail.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= max) {
    return res.status(429).json({
      success: false,
      message: "Too many attempts for this email. Please wait a few minutes before trying again.",
    });
  }

  entry.count += 1;
  return next();
};

// Global baseline: applies to every request as a general abuse safety
// net, on top of (not instead of) the tighter per-route limiters below.
// Generous enough that no real user should ever hit it during normal
// browsing/reading — it's aimed at scripted abuse, not people.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests from this network. Please slow down and try again shortly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// Login: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP-related routes: max 5 attempts per 10 minutes per IP
// (covers verify-otp, verify-signup-otp, resend-signup-otp, forgot-password)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20, // was 5 for ALL steps together; the per-email limiter above is the strict one
  message: {
    success: false,
    message: "Too many attempts. Please wait a few minutes before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration: max 5 accounts per hour per IP (slows down mass fake signups)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many accounts created from this network. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment order creation: max 20 attempts per 10 minutes per IP.
// Generous enough for a genuine retry after a dropped popup, but stops
// someone scripting /create-order to spam pending Razorpay orders.
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many payment attempts. Please wait a few minutes and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form: max 5 messages per hour per IP (stops spam and inbox flooding)
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many messages sent from this network. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, loginLimiter, otpLimiter, otpEmailLimiter, registerLimiter, paymentLimiter, contactLimiter };