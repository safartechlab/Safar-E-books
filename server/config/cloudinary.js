const { v2: cloudinary } = require("cloudinary");
let configured = false;

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );

const getCloudinary = () => {
  if (!configured) {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env"
      );
    }
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ secure: true });
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    configured = true;
  }
  return cloudinary;
};

module.exports = { getCloudinary, isCloudinaryConfigured };
