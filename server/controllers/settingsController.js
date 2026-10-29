const { getSiteSettings, updateSiteSettings } = require("../config/siteSettings");

// Public: the client needs this to show the maintenance page and the
// "signups paused" notice.
const getPublicSettings = async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.status(200).json({ success: true, ...settings });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Admin only
// Basic website details: field -> max length. Empty string clears the field.
const INFO_FIELDS = {
  siteName: 80,
  supportEmail: 120,
  contactPhone: 40,
  address: 300,
  websiteUrl: 200,
  copyrightText: 200,
};

const updateSettings = async (req, res) => {
  try {
    const { signupsPaused, maintenanceMode, maintenanceMessage } = req.body;
    const update = {};

    if (signupsPaused !== undefined) {
      if (typeof signupsPaused !== "boolean") {
        return res.status(400).json({ success: false, message: "signupsPaused must be true or false" });
      }
      update.signupsPaused = signupsPaused;
    }

    if (maintenanceMode !== undefined) {
      if (typeof maintenanceMode !== "boolean") {
        return res.status(400).json({ success: false, message: "maintenanceMode must be true or false" });
      }
      update.maintenanceMode = maintenanceMode;
    }

    if (maintenanceMessage !== undefined) {
      if (typeof maintenanceMessage !== "string" || maintenanceMessage.length > 300) {
        return res.status(400).json({ success: false, message: "Message must be text up to 300 characters" });
      }
      update.maintenanceMessage = maintenanceMessage.trim();
    }

    for (const [field, maxLen] of Object.entries(INFO_FIELDS)) {
      const value = req.body[field];
      if (value === undefined) continue;

      if (typeof value !== "string" || value.trim().length > maxLen) {
        return res.status(400).json({
          success: false,
          message: `${field} must be text up to ${maxLen} characters`,
        });
      }

      const trimmed = value.trim();

      if (field === "supportEmail" && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return res.status(400).json({ success: false, message: "Please enter a valid email address" });
      }
      if (field === "websiteUrl" && trimmed && !/^https?:\/\/\S+$/i.test(trimmed)) {
        return res.status(400).json({ success: false, message: "Website URL must start with http:// or https://" });
      }

      update[field] = trimmed;
    }

    const settings = await updateSiteSettings(update);
    res.status(200).json({ success: true, message: "Settings updated", ...settings });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { getPublicSettings, updateSettings };