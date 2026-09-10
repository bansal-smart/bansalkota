// Tiny client helper to load Cashfree Hosted Checkout SDK and start payment
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_modal" }) => Promise<any>;
    };
  }
}

let sdkPromise: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

type StartPaymentArgs =
  | { orderType: "cart"; items: Array<{ type: "book" | "pack"; id: string; quantity: number }>; shipping: any }
  // centreId is a hint for resolving a centre-offering price — the server
  // re-resolves and validates it against course_offerings, never trusts it.
  | { orderType: "course"; courseId: string; enquiryId?: string; centreId?: string }
  | { orderType: "test_series"; testSeriesId: string };

type CashfreeOrderData = { order_id: string; payment_session_id: string; cf_order_id: string | null; env: string };

// Split out from startCashfreeCheckout so a caller that needs the order id
// durably persisted (e.g. linking a lead-capture row to its order) doesn't
// have to wait on cf.checkout() resolving — that promise only settles once
// the user finishes interacting with the payment popup (paid, failed, or
// closed it), which can be a long time after the order already exists
// server-side, or may reject if the popup is dismissed without completing.
export async function createCashfreeOrder(args: StartPaymentArgs): Promise<CashfreeOrderData> {
  const { data, error } = await supabase.functions.invoke("cashfree-create-order", { body: args });
  if (error) throw new Error(error.message || "Could not start payment");
  if (!data?.payment_session_id) throw new Error(data?.error || "Payment session missing");
  return data as CashfreeOrderData;
}

export async function openCashfreeCheckout(paymentSessionId: string, env: string) {
  await loadSdk();
  const cf = window.Cashfree!({ mode: (env === "production" ? "production" : "sandbox") as any });
  return cf.checkout({ paymentSessionId, redirectTarget: "_modal" });
}

export async function startCashfreeCheckout(args: StartPaymentArgs) {
  const data = await createCashfreeOrder(args);
  await openCashfreeCheckout(data.payment_session_id, data.env);
  return data;
}

export async function startBoostCashfreeCheckout(registrationId: string) {
  const { data, error } = await supabase.functions.invoke("cashfree-boost-pay", {
    body: { registration_id: registrationId },
  });
  if (error) throw new Error(error.message || "Could not start payment");
  if (!data?.payment_session_id) throw new Error(data?.error || "Payment session missing");

  await loadSdk();
  const cf = window.Cashfree!({ mode: (data.env === "production" ? "production" : "sandbox") as any });
  await cf.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_modal" });
  return data;
}

