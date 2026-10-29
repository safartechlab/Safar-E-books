// Is the person using a phone or tablet?
//
// Used to keep the ADMIN side of the site laptop/desktop-only. The server
// does its own check from the request headers (server/utils/deviceCheck.js);
// this one runs in the browser and also catches iPads, which by default pretend
// to be a Mac in their User-Agent and so cannot be spotted by the server.
//
// It is a policy guard, not a security boundary (a user-agent can be faked).

export const ADMIN_DESKTOP_ONLY_MESSAGE =
  "Admin access is only available from a laptop or desktop computer. Please sign in from a computer.";

const MOBILE_OR_TABLET_UA =
  /android|iphone|ipad|ipod|ipados|blackberry|bb10|windows phone|iemobile|opera mini|opera mobi|\bmobile\b|\btablet\b|\bsilk\b|kindle|playbook|webos|symbian|nokia|fennec/i;

export const isMobileOrTabletDevice = () => {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  if (MOBILE_OR_TABLET_UA.test(ua)) return true;

  // Chrome / Edge expose this directly.
  if (navigator.userAgentData && navigator.userAgentData.mobile === true) return true;

  // iPadOS Safari reports "Macintosh" but, unlike a real Mac, has a touch screen.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
};
