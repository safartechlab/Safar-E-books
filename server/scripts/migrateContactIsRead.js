// One-time migration: backfills the new "isRead" field on any Contact
// message saved under the old, mismatched "status" field before this fix.
//
// Safe to run more than once — it only touches documents that don't
// already have "isRead" set, so re-running it after the first successful
// run is a no-op.
//
// Usage (from the server/ folder):
//   node scripts/migrateContactIsRead.js

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const contacts = db.collection("contacts");

  // Old, correctly-read-and-marked messages: status was "Read"
  const readResult = await contacts.updateMany(
    { isRead: { $exists: false }, status: "Read" },
    { $set: { isRead: true } }
  );

  // Everything else missing isRead (status was "Unread", or missing too)
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