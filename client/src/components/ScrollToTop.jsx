import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router keeps the old scroll position when the route changes, so a
// new page used to open at the bottom (where the footer link was clicked).
// This jumps to the top on every route change. Pages opened with a #hash
// are left alone so in-page anchors still work.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
