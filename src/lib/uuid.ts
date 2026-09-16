// crypto.randomUUID only exists in a secure context (HTTPS, or localhost) — on
// a plain-HTTP LAN deployment (e.g. http://192.168.x.x:8080) it's undefined,
// so calling it directly throws a synchronous TypeError instead of rejecting
// a promise. Every call site here uses the id as a client-side dedupe/
// reference key, never a security token, so a non-cryptographic fallback is
// fine when the native API is unavailable.
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
