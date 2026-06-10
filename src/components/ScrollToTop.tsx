import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to the top whenever the route pathname changes.
 * Mount once inside <BrowserRouter>.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Disable browser's scroll restoration so SPA navigation always starts at top
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
