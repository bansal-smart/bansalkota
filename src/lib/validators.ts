// Shared validators

/**
 * Normalises a phone-like string to digits-only.
 */
export const normalisePhone = (value: string): string => (value || "").replace(/\D/g, "");

/**
 * Strict India-style 10-digit mobile validation.
 * Accepts only 10 digits starting with 6/7/8/9. Strips spaces/symbols first.
 */
export const isValidIndianPhone = (value: string): boolean => {
  const digits = normalisePhone(value);
  return /^[6-9]\d{9}$/.test(digits);
};

/**
 * Returns a friendly error message for an invalid phone, or null when valid.
 */
export const phoneError = (value: string): string | null =>
  isValidIndianPhone(value) ? null : "Enter a valid 10-digit mobile number";

/**
 * Slugify a string for blog/news URLs.
 */
export const slugify = (input: string): string =>
  (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
