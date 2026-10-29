require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const contacts = db.collection("contacts");

  const readResult = await contacts.updateMany(
    { isRead: { $exists: false }, status: "Read" },
    { $set: { isRead: true } }
  );

  const unreadResult = await contacts.updateMany(
    { isRead: { $exists: false } },
    { $set: { isRead: false } }
  );

  console.log(`Marked ${readResult.modifiedCount} old message(s) as read.`);
  console.log(`Marked ${unreadResult.modifiedCount} old message(s) as unread.`);
  console.log("Migration complete.");

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});