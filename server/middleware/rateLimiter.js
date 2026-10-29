const rateLimit = require("express-rate-limit");

const otpAttemptsByEmail = new Map(); 
const OTP_EMAIL_WINDOW_MS = 10 * 60 * 1000;

const OTP_EMAIL_MAX_BY_PATH = {
  "/forgot-password": 5,
  "/resend-signup-otp": 5,
  "/verify-otp": 10,
  "/verify-signup-otp": 10,
  "/reset-password": 10,
};
const OTP_EMAIL_MAX_DEFAULT = 5;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpAttemptsByEmail) {
    if (now - entry.windowStart > OTP_EMAIL_WINDOW_MS) otpAttemptsByEmail.delete(key);
  }
}, 10 * 60 * 1000).unref();

const otpEmailLimiter = (req, res, next) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return next();

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

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many attempts. Please wait a few minutes before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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