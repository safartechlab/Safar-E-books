const MOBILE_OR_TABLET_UA =
  /android|iphone|ipad|ipod|ipados|blackberry|bb10|windows phone|iemobile|opera mini|opera mobi|\bmobile\b|\btablet\b|\bsilk\b|kindle|playbook|webos|symbian|nokia|fennec/i;

const MOBILE_PLATFORMS = ["android", "ios", "ipados"];

const isMobileOrTabletRequest = (req) => {
  const userAgent = String(req.headers["user-agent"] || "");
  if (MOBILE_OR_TABLET_UA.test(userAgent)) return true;

  if (String(req.headers["sec-ch-ua-mobile"] || "").trim() === "?1") return true;

  const platform = String(req.headers["sec-ch-ua-platform"] || "")
    .replace(/"/g, "")
    .trim()
    .toLowerCase();
  if (MOBILE_PLATFORMS.includes(platform)) return true;

  return false;
};

const ADMIN_DESKTOP_ONLY_MESSAGE =
  "Admin access is only available from a laptop or desktop computer. Please sign in from a computer.";

module.exports = { isMobileOrTabletRequest, ADMIN_DESKTOP_ONLY_MESSAGE };
