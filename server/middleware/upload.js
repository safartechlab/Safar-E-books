const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom storage: streams each file straight to Cloudinary
const storage = {
  _handleFile(req, file, cb) {
    const isPdf = file.fieldname === "pdfFile";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const options = isPdf
      ? {
          folder: "safar-ebooks/pdfs",
          resource_type: "raw",
          type: "private", // assumption: your .env says "private PDFs"
          public_id: `${unique}.pdf`,
        }
      : {
          folder: "safar-ebooks/covers",
          resource_type: "image",
          public_id: unique,
        };

    const upload = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return cb(err);
      cb(null, {
        path: result.secure_url,
        filename: result.public_id,
        size: result.bytes,
      });
    });
    file.stream.pipe(upload);
  },
  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: file.fieldname === "pdfFile" ? "raw" : "image" },
      () => cb(null)
    );
  },
};

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "coverImage") {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG and WEBP images are allowed"));
  } else if (file.fieldname === "pdfFile") {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  } else {
    cb(new Error("Invalid file field"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;