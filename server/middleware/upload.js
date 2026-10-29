const multer = require("multer");

// Files are kept in memory only long enough to be checked and sent to
// Cloudinary (see utils/cloudinaryStorage.js). Nothing is saved on the
// server's disk, so uploads survive redeploys on any host.
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "coverImage") {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
  } else if (file.fieldname === "pdfFile") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  } else {
    cb(new Error("Invalid file field"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

module.exports = upload;
