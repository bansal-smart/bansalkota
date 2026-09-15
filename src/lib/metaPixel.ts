type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
  queue: unknown[][];
  push: MetaPixelFunction;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "";

export function trackMetaEvent(event: string, data?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, data);
}

export function trackCustomMetaEvent(event: string, data?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("trackCustom", event, data);
  } catch {
    // Pixel tracking must never break navigation (e.g. ad blockers stubbing fbq).
  }
}

export function trackQuickAccessClick(section: string) {
  trackCustomMetaEvent("QuickAccessClick", { section });
}
