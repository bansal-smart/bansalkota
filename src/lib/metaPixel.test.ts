import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("metaPixel conversion dedupe", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubEnv("VITE_META_PIXEL_ID", "618333955963811");
    (window as any).fbq = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fires Purchase once per dedupe key, and again for a different key", async () => {
    const { trackPurchaseOnce } = await import("./metaPixel");
    trackPurchaseOnce("order:abc", 500, "INR");
    expect((window as any).fbq).toHaveBeenCalledWith("track", "Purchase", { value: 500, currency: "INR" });
    (window as any).fbq.mockClear();

    trackPurchaseOnce("order:abc", 500, "INR");
    expect((window as any).fbq).not.toHaveBeenCalled();

    trackPurchaseOnce("order:xyz", 700, "INR");
    expect((window as any).fbq).toHaveBeenCalledWith("track", "Purchase", { value: 700, currency: "INR" });
  });

  it("keeps Purchase and CompleteRegistration dedupe keys independent for the same id", async () => {
    const { trackPurchaseOnce, trackCompleteRegistrationOnce } = await import("./metaPixel");
    trackPurchaseOnce("course:1", 0, "INR");
    trackCompleteRegistrationOnce("course:1", { content_name: "Free Course" });
    expect((window as any).fbq).toHaveBeenCalledTimes(2);
    expect((window as any).fbq).toHaveBeenNthCalledWith(2, "track", "CompleteRegistration", { content_name: "Free Course" });
  });

  it("trackCtaClick fires a custom event with the button id", async () => {
    const { trackCtaClick } = await import("./metaPixel");
    trackCtaClick("cta-explore-courses");
    expect((window as any).fbq).toHaveBeenCalledWith("trackCustom", "CTAClick", { id: "cta-explore-courses" });
  });

  it("trackInitiateCheckout fires every time, with no dedupe guard", async () => {
    const { trackInitiateCheckout } = await import("./metaPixel");
    trackInitiateCheckout({ value: 100 });
    trackInitiateCheckout({ value: 100 });
    expect((window as any).fbq).toHaveBeenCalledTimes(2);
  });
});
