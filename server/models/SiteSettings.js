const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    signupsPaused: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "", maxlength: 300 },

    siteName: { type: String, default: "", trim: true, maxlength: 80 },
    supportEmail: { type: String, default: "", trim: true, maxlength: 120 },
    contactPhone: { type: String, default: "", trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 300 },
    websiteUrl: { type: String, default: "", trim: true, maxlength: 200 },
    copyrightText: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);