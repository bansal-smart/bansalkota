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
  | { orderType: "course"; courseId: string; enquiryId?: string }
  | { orderType: "test_series"; testSeriesId: string };

export async function startCashfreeCheckout(args: StartPaymentArgs) {
  const { data, error } = await supabase.functions.invoke("cashfree-create-order", { body: args });
  if (error) throw new Error(error.message || "Could not start payment");
  if (!data?.payment_session_id) throw new Error(data?.error || "Payment session missing");

  await loadSdk();
  const cf = window.Cashfree!({ mode: (data.env === "production" ? "production" : "sandbox") as any });
  await cf.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
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
  await cf.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
  return data;
}

