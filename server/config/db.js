const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  // Check whether MongoDB URI exists
  if (!mongoURI || !mongoURI.trim()) {
    throw new Error(
      "MONGODB_URI is missing. Check GoDaddy Settings > Secrets."
    );
  }

  try {
    console.log("🔄 Connecting to MongoDB Atlas...");

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
    });

    console.log("✅ MongoDB Connected Successfully");
    console.log(
      "🗄️ Database:",
      mongoose.connection.name
    );
    console.log(
      "🌐 MongoDB Host:",
      mongoose.connection.host
    );

    return mongoose.connection;

  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error("Error name:", error.name);
    console.error("Error code:", error.code || "N/A");
    console.error("Error message:", error.message);

    if (error.message?.includes("ENOTFOUND")) {
      console.error(
        "Possible cause: MongoDB hostname or DNS resolution problem."
      );
    } else if (
      error.message?.includes("Authentication failed")
    ) {
      console.error(
        "Possible cause: Incorrect MongoDB database username or password."
      );
    } else if (
      error.message?.includes("IP")
    ) {
      console.error(
        "Possible cause: MongoDB Atlas network access restriction."
      );
    } else if (
      error.message?.includes("Server selection timed out")
    ) {
      console.error(
        "Possible cause: Network connectivity, DNS, firewall, or Atlas availability."
      );
    }

    throw error;
  }
};

// Monitor database connection events
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB runtime error:", error.message);
});

module.exports = connectDB;