// Best-effort "is this request coming from a phone or tablet?" check.
//
// Used to keep the ADMIN side of the site laptop/desktop-only: an admin
// can't sign in from a phone or tablet, and admin-only API routes refuse
// requests that come from one.
//
// How it works: browsers tell the server what kind of device they are on
// through the User-Agent header (and, in Chrome/Edge, the newer
// "Sec-CH-UA-Mobile" / "Sec-CH-UA-Platform" client-hint headers). We look at
// both.
//
// Honest limits: this is a policy guard, not a security boundary. Someone who
// deliberately fakes their User-Agent, or uses a phone browser's "Desktop
// site" mode (which also changes the User-Agent), can get past it. The thing
// that actually protects the admin account is a strong password. iPads in
// their default Safari mode report themselves as a Mac, so they cannot be
// told apart on the server — the web app has a second, in-browser check for
// that case (see client/src/utils/device.js).

const MOBILE_OR_TABLET_UA =
  /android|iphone|ipad|ipod|ipados|blackberry|bb10|windows phone|iemobile|opera mini|opera mobi|\bmobile\b|\btablet\b|\bsilk\b|kindle|playbook|webos|symbian|nokia|fennec/i;

const MOBILE_PLATFORMS = ["android", "ios", "ipados"];

const isMobileOrTabletRequest = (req) => {
  const userAgent = String(req.headers["user-agent"] || "");
  if (MOBILE_OR_TABLET_UA.test(userAgent)) return true;

  // Client hints: "?1" means "mobile device", platform comes quoted ("Android").
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
