require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
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
const wishlistRoutes = require("./routes/wishlistRoutes.js");
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

// ============================================
// 1. ENVIRONMENT VARIABLE VALIDATION
// ============================================

const EMAIL_PROVIDER = String(
  process.env.EMAIL_PROVIDER || "smtp"
).trim().toLowerCase();

const EMAIL_VARS_BY_PROVIDER = {
  smtp: ["EMAIL_PASS"],
  resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  brevo: ["BREVO_API_KEY", "EMAIL_FROM"],
};

const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "EMAIL_USER",
  ...(EMAIL_VARS_BY_PROVIDER[EMAIL_PROVIDER] ||
    EMAIL_VARS_BY_PROVIDER.smtp),
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingEnvVars.length > 0) {
  console.error(
    `❌ Missing required environment variable(s): ${missingEnvVars.join(", ")}`
  );

  console.error(
    "Check GoDaddy Settings > Secrets or your local .env file."
  );

  process.exit(1);
}

// ============================================
// 2. EXPRESS APPLICATION INITIALIZATION
// ============================================

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

// ============================================
// 3. FRONTEND CONFIGURATION
// ============================================

const clientDistPath = path.join(
  __dirname,
  "..",
  "client",
  "dist"
);

const clientIndexFile = path.join(
  clientDistPath,
  "index.html"
);

const wantsClient = process.env.SERVE_CLIENT === "true";

const serveClient =
  wantsClient && fs.existsSync(clientIndexFile);

if (wantsClient && !serveClient) {
  console.warn(
    `⚠️ SERVE_CLIENT=true but ${clientIndexFile} was not found. ` +
    'Run "npm run build" in /client first. Serving API only.'
  );
}

// ============================================
// 4. PAYMENT WEBHOOK
// ============================================

// Razorpay requires the raw request body for
// webhook signature verification.

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// ============================================
// 5. SECURITY MIDDLEWARE
// ============================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    contentSecurityPolicy: serveClient
      ? false
      : undefined,

    crossOriginOpenerPolicy: serveClient
      ? { policy: "same-origin-allow-popups" }
      : undefined,
  })
);

// ============================================
// 6. CORS CONFIGURATION
// ============================================

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    "⚠️ CORS_ORIGIN is not set — allowing requests from ANY origin. " +
    "Set CORS_ORIGIN before going to production."
  );
}

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, callback) => {
            if (
              !origin ||
              allowedOrigins.includes(origin.replace(/\/+$/, ""))
            ) {
              return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
          },
        }
      : undefined
  )
);

// ============================================
// 7. STATIC FILES
// ============================================

app.use(
  "/uploads/covers",
  express.static(
    path.join(__dirname, "uploads/covers")
  )
);

// ============================================
// 8. FRONTEND STATIC SERVING
// ============================================

if (serveClient) {
  app.use(
    express.static(clientDistPath, {
      index: false,

      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (
          filePath.includes(`${path.sep}assets${path.sep}`)
        ) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
          );
        } else {
          res.setHeader(
            "Cache-Control",
            "public, max-age=3600"
          );
        }
      },
    })
  );

  app.use((req, res, next) => {
    if (
      req.method !== "GET" &&
      req.method !== "HEAD"
    ) {
      return next();
    }

    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads")
    ) {
      return next();
    }

    res.setHeader("Cache-Control", "no-cache");

    res.sendFile(clientIndexFile);
  });
}

// ============================================
// 9. GLOBAL MIDDLEWARE
// ============================================

app.use(globalLimiter);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ============================================
// 10. MAINTENANCE MODE
// ============================================

app.use("/api", maintenanceMode);

// ============================================
// 11. API ROUTES
// ============================================

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

// ============================================
// 12. HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");

  const databaseConnected =
    mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    status: databaseConnected ? "ok" : "database_unavailable",
    database: databaseConnected ? "connected" : "disconnected",
  });
});

// ============================================
// 13. ROOT ROUTE
// ============================================

if (!serveClient) {
  app.get("/", (req, res) => {
    res.send("🚀 eBook Platform API is Running...");
  });
}

// ============================================
// 14. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================
// 15. GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (
    err?.message?.startsWith("Only ") ||
    err?.message === "Invalid file field"
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: "Something went wrong on our end. Please try again.",
  });
});

// ============================================
// 16. START SERVER AFTER DATABASE CONNECTION
// ============================================

async function startServer() {
  try {
    console.log("======================================");
    console.log("🚀 Starting Safar E-Books Backend");
    console.log("======================================");

    // Connect to MongoDB first
    console.log("🔄 Connecting to MongoDB Atlas...");

    await connectDB();

    console.log("✅ MongoDB connection established");

    // Synchronize Reading History indexes
    try {
      console.log("🔄 Synchronizing Reading History indexes...");

      await require("./models/ReadingHistory").syncIndexes();

      console.log("✅ Reading History indexes synchronized");
    } catch (error) {
      console.error(
        "⚠️ Reading History index synchronization failed:",
        error.message
      );
    }

    // Start Express server
    const server = app.listen(PORT,'0.0.0.0', () => {
      console.log("======================================");
      console.log(`✅ Server running on port ${PORT}`);
      console.log("🗄️ Database: Connected");
      console.log(
        "🌐 Environment:",
        process.env.NODE_ENV || "development"
      );
      console.log("======================================");

      // Start background jobs after successful DB connection
      try {
        startRenewalReminderJob();
        console.log("⏰ Renewal reminder job started");
      } catch (error) {
        console.error(
          "❌ Renewal reminder job failed:",
          error.message
        );
      }

      try {
        startReconciliationJob();
        console.log("🔁 Pending-order reconciliation job started");
      } catch (error) {
        console.error(
          "❌ Pending-order reconciliation job failed:",
          error.message
        );
      }
    });

    server.on("error", (error) => {
      console.error("❌ HTTP server error:", error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error("======================================");
    console.error("❌ APPLICATION STARTUP FAILED");
    console.error("MongoDB or application startup error:");
    console.error(error.message);
    console.error("======================================");

    process.exit(1);
  }
}

// Start application
startServer();
