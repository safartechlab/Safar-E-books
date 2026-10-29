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

connectDB()
  .then(() => require("./models/ReadingHistory").syncIndexes())
  .catch((e) => console.error("[startup] could not sync reading-history index:", e.message));

const app = express();

app.set("trust proxy", 1);

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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },

    contentSecurityPolicy: serveClient ? false : undefined,

    crossOriginOpenerPolicy: serveClient ? { policy: "same-origin-allow-popups" } : undefined,
  })
);

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

            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error("Not allowed by CORS"));
          },
        }
      : undefined
  )
);

app.use("/uploads/covers", express.static(path.join(__dirname, "uploads/covers")));

if (serveClient) {
  app.use(
    express.static(clientDistPath, {
      index: false,

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