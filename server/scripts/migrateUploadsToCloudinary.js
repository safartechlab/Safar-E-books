// One-time migration: moves book covers and PDFs that are still stored on
// this server's disk (/uploads/...) to Cloudinary, and updates each book.
//
// Safe to run more than once — it only touches books whose cover/PDF still
// points at a local /uploads path. It does NOT delete the local files, so
// you can check the site first and remove server/uploads yourself later.
//
// Usage (from the server/ folder, with Cloudinary set in .env):
//   node scripts/migrateUploadsToCloudinary.js

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const { uploadCover, uploadPdf } = require("../utils/cloudinaryStorage");

const ROOT = path.join(__dirname, "..");

const readLocal = (relativePath) => {
  const full = path.join(ROOT, relativePath);
  return fs.existsSync(full) ? fs.readFileSync(full) : null;
};

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const books = await Book.find({
    $or: [
      { coverImage: /^\/uploads\// },
      { pdfUrl: /^\/uploads\// },
    ],
  });
  console.log(`Books to migrate: ${books.length}`);

  let moved = 0;
  let skipped = 0;

  for (const book of books) {
    try {
      const update = {};

      if (book.coverImage?.startsWith("/uploads/")) {
        const buffer = readLocal(book.coverImage);
        if (buffer) update.coverImage = await uploadCover(buffer);
        else console.log(`  [skip] cover file missing for "${book.title}": ${book.coverImage}`);
      }

      if (book.pdfUrl?.startsWith("/uploads/")) {
        const buffer = readLocal(book.pdfUrl);
        if (buffer) update.pdfUrl = await uploadPdf(buffer);
        else console.log(`  [skip] PDF file missing for "${book.title}": ${book.pdfUrl}`);
      }

      if (Object.keys(update).length) {
        await Book.updateOne({ _id: book._id }, { $set: update });
        moved += 1;
        console.log(`  [ok] ${book.title}`);
      } else {
        skipped += 1;
      }
    } catch (err) {
      skipped += 1;
      console.log(`  [error] ${book.title}: ${err.message}`);
    }
  }

  console.log(`Done. Migrated: ${moved}, skipped/failed: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
