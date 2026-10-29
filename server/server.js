require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");
const bookRoutes = require("./routes/bookRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const contactRoutes = require("./routes/contactRoutes");
const readingHistoryRoutes = require("./routes/readingHistoryRoutes");
const wishlistRoutes  = require("./routes/wishlistRoutes.js");
const reviewRoutes = require("./routes/reviewRoutes");

const paymentRoutes = require("./routes/paymentRoutes");
const refundRoutes = require("./routes/refundRoutes");
const { razorpayWebhook } = require("./controllers/paymentController");
const { startRenewalReminderJob } = require("./scripts/renewalReminderJob");
const { startReconciliationJob } = require("./scripts/reconcilePendingOrders");

const settingsRoutes = require("./routes/settingsRoutes");
const maintenanceMode = require("./middleware/maintenanceMode");
const optionRoutes = require("./routes/optionRoutes");
const statsRoutes = require("./routes/statsRoutes");

dotenv.config();

// Fail fast and loudly if required config is missing, rather than
// starting up and only failing later when a request actually needs
// one of these (e.g. the first login after a bad deploy).
// EMAIL_PROVIDER: "smtp" (default, Gmail), "resend" or "brevo" - see config/email.js.
// EMAIL_USER is always needed (it is the "from"/inbox address used in the code).
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
const EMAIL_VARS_BY_PROVIDER = {
  smtp: ["EMAIL_PASS"],
  resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  brevo: ["BREVO_API_KEY", "EMAIL_FROM"],
};
const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "EMAIL_USER",
  ...(EMAIL_VARS_BY_PROVIDER[EMAIL_PROVIDER] || EMAIL_VARS_BY_PROVIDER.smtp),
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variable(s): ${missingEnvVars.join(", ")}`);
  console.error("   Check your .env against .env.example and set these before starting the server.");
  process.exit(1);
}

// After connecting, make sure the reading-history index is the new
// (user, book, language) one. Before, this needed a manual migration step, and
// until then saving a second language of the same book failed.
connectDB()
  .then(() => require("./models/ReadingHistory").syncIndexes())
  .catch((e) => console.error("[startup] could not sync reading-history index:", e.message));

const app = express();

// Behind a reverse proxy (Nginx, Render, Railway, etc.) every request
// otherwise looks like it comes from the proxy's own IP, so req.ip is
// wrong and the rate limiters below would effectively rate-limit the
// whole site as a single visitor. This tells Express to trust the
// X-Forwarded-For header from the first hop.
app.set("trust proxy", 1);

// ---------------------------------------------------------------------
// Optional "one server does everything" mode.
//
// With SERVE_CLIENT=true, this Express app also serves the built website
// (client/dist) and falls back to index.html for page routes, so a single
// Node process on a single domain is a complete deployment — no CORS, no
// separate web server needed.
//
// If you put Nginx/Apache in front and let IT serve client/dist, leave
// SERVE_CLIENT unset: Express then only answers /api and /uploads.
// ---------------------------------------------------------------------
const clientDistPath = path.join(__dirname, "..", "client", "dist");
const clientIndexFile = path.join(clientDistPath, "index.html");
const wantsClient = process.env.SERVE_CLIENT === "true";
const serveClient = wantsClient && fs.existsSync(clientIndexFile);
if (wantsClient && !serveClient) {
  console.warn(
    `⚠️  SERVE_CLIENT=true but ${clientIndexFile} was not found. Run "npm run build" in /client first. Serving the API only.`
  );
}

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Helmet's default Content-Security-Policy is meant for a pure JSON API.
    // On an HTML page it would block Razorpay checkout, Google Fonts, the
    // PDF.js worker and Cloudinary images, so it is switched off when this
    // server also serves the website.
    contentSecurityPolicy: serveClient ? false : undefined,
    // Razorpay opens pop-ups for some payment methods (UPI apps, bank 3-D
    // Secure pages); the strict default would cut those off from the page.
    crossOriginOpenerPolicy: serveClient ? { policy: "same-origin-allow-popups" } : undefined,
  })
);

// CORS_ORIGIN should be a comma-separated list of allowed origins in
// production (e.g. "https://bookverse.com,https://www.bookverse.com").
// Without it set, this falls back to wide-open CORS — fine for local
// dev, NOT fine for production (any website could call this API using
// a visitor's logged-in session/token).
// A trailing "/" is stripped, because browsers send origins WITHOUT one and
// "https://safarebooks.com/" would otherwise never match.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  console.warn("⚠️  CORS_ORIGIN is not set — allowing requests from ANY origin. Set CORS_ORIGIN before going to production.");
}
app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, callback) => {
            // requests with no Origin header (server-to-server, curl, the
            // Razorpay webhook) are always allowed through.
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error("Not allowed by CORS"));
          },
        }
      : undefined
  )
);

// Static files (book covers, profile photos) are served before the global
// rate limiter — a single page load can easily request a dozen+ cover
// images, and those shouldn't eat into the same request budget as API
// calls. The limiter still protects every real API route below.
app.use("/uploads/covers", express.static(path.join(__dirname, "uploads/covers")));

// Website files (only in SERVE_CLIENT mode). Mounted before the rate limiter
// for the same reason as the covers above: one page view loads dozens of
// JS/CSS/image files and they must not use up the API request budget.
if (serveClient) {
  app.use(
    express.static(clientDistPath, {
      index: false,
      // Vite puts a content hash in every file name under /assets, so those
      // can be cached "forever"; index.html must always be re-checked so a
      // new deploy is picked up straight away.
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    })
  );

  // Any other page URL (/library, /book/123, /admin/dashboard ...) is a
  // React route: hand back index.html and let the browser router take over.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(clientIndexFile);
  });
}

app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use("/api", maintenanceMode);

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/options", optionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reading-history", readingHistoryRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/stats", statsRoutes);

// Simple "is the API up?" check. Handy for uptime monitors.
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

if (!serveClient) {
  app.get("/", (req, res) => {
    res.send("🚀 eBook Platform API is Running...");
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err?.message?.startsWith("Only ") || err?.message === "Invalid file field") {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: "Something went wrong on our end. Please try again.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  startRenewalReminderJob();
  console.log("⏰ Renewal reminder job started");
  startReconciliationJob();
  console.log("🔁 Pending-order reconciliation job started (webhook backstop)");
});