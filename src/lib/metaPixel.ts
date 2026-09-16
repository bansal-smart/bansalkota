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

// Browsing-intent CTAs outside the main nav (homepage hero, "Enroll Now"
// trigger buttons that just open a modal) — same mechanism as
// trackQuickAccessClick, generalized to any stable button id.
export function trackCtaClick(id: string) {
  trackCustomMetaEvent("CTAClick", { id });
}

// Fired at the moment a real Cashfree checkout attempt begins (immediately
// before the Cashfree call), not at the outer "Enroll Now" click. Meta's own
// standard event — no dedupe guard, expected to fire on every attempt
// including retries after a failed/abandoned payment.
export function trackInitiateCheckout(data?: Record<string, unknown>) {
  trackMetaEvent("InitiateCheckout", data);
}

// Payment/registration confirmation URLs can be revisited long after the
// fact — email receipt, browser history, a bookmark — so the dedupe guard
// uses localStorage (survives across tabs/sessions), not sessionStorage, to
// avoid re-reporting a real conversion as a new one.
function trackConversionOnce(
  storageKeyPrefix: string,
  eventName: string,
  dedupeKey: string,
  data?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const storageKey = `meta_pixel_${storageKeyPrefix}_${dedupeKey}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // localStorage unavailable (private mode / disabled) — fire once for this
    // page load; no cross-session guard possible in that case.
  }
  trackMetaEvent(eventName, data);
}

export function trackPurchaseOnce(dedupeKey: string, value: number, currency = "INR") {
  trackConversionOnce("purchase", "Purchase", dedupeKey, { value, currency });
}

export function trackCompleteRegistrationOnce(dedupeKey: string, data?: Record<string, unknown>) {
  trackConversionOnce("complete_registration", "CompleteRegistration", dedupeKey, data);
}
