const SiteSettings = require("../models/SiteSettings");

const CACHE_MS = 5000;
let cache = null;
let cachedAt = 0;

const getSiteSettings = async () => {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;

  const doc = await SiteSettings.findOne({ key: "global" }).lean();

  cache = {
    signupsPaused: Boolean(doc?.signupsPaused),
    maintenanceMode: Boolean(doc?.maintenanceMode),
    maintenanceMessage: doc?.maintenanceMessage || "",
    siteName: doc?.siteName || "",
    supportEmail: doc?.supportEmail || "",
    contactPhone: doc?.contactPhone || "",
    address: doc?.address || "",
    websiteUrl: doc?.websiteUrl || "",
    copyrightText: doc?.copyrightText || "",
  };
  cachedAt = Date.now();
  return cache;
};

const updateSiteSettings = async (update) => {
  await SiteSettings.findOneAndUpdate(
    { key: "global" },
    { $set: update },
    { upsert: true, returnDocument: "after" }
  );
  cache = null; // force a fresh read next time
  return getSiteSettings();
};

module.exports = { getSiteSettings, updateSiteSettings };