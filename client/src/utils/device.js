export const ADMIN_DESKTOP_ONLY_MESSAGE =
  "Admin access is only available from a laptop or desktop computer. Please sign in from a computer.";

const MOBILE_OR_TABLET_UA =
  /android|iphone|ipad|ipod|ipados|blackberry|bb10|windows phone|iemobile|opera mini|opera mobi|\bmobile\b|\btablet\b|\bsilk\b|kindle|playbook|webos|symbian|nokia|fennec/i;

export const isMobileOrTabletDevice = () => {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  if (MOBILE_OR_TABLET_UA.test(ua)) return true;

  if (navigator.userAgentData && navigator.userAgentData.mobile === true) return true;

  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
};
