import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { META_PIXEL_ID } from "@/lib/metaPixel";

const SCRIPT_ID = "meta-pixel-script";

const MetaPixel = () => {
  const location = useLocation();

  useEffect(() => {
    if (!META_PIXEL_ID || typeof window === "undefined") {
      if (import.meta.env.DEV) {
        console.warn("Meta Pixel disabled: VITE_META_PIXEL_ID is not configured");
      }
      return;
    }

    if (!/^\d+$/.test(META_PIXEL_ID)) {
      console.error("Meta Pixel disabled: VITE_META_PIXEL_ID must be numeric");
      return;
    }

    if (!window.fbq) {
      const fbq = ((...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      }) as NonNullable<typeof window.fbq>;
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.push = fbq;
      window.fbq = fbq;
      window._fbq = fbq;
      fbq("init", META_PIXEL_ID);
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID || !window.fbq) return;
    window.fbq("track", "PageView");
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default MetaPixel;
