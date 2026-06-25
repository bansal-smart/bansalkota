// Cashfree: create payment session for a BOOST registration (no auth)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const SECRET = Deno.env.get("CASHFREE_SECRET_KEY")!;
const ENV = (Deno.env.get("CASHFREE_ENV") || "sandbox").toLowerCase();
const CF_BASE = ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
const CF_API_VERSION = "2025-01-01";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { registration_id } = await req.json();
    if (!registration_id) return json({ error: "registration_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: reg, error } = await admin
      .from("boost_registrations")
      .select("id, full_name, email, phone, amount, payment_status, cf_payment_session_id")
      .eq("id", registration_id)
      .maybeSingle();
    if (error || !reg) return json({ error: "Registration not found" }, 404);
    if (reg.payment_status === "paid") return json({ error: "Already paid" }, 400);

    const total = +Number(reg.amount || 0).toFixed(2);
    if (total <= 0) return json({ error: "Invalid amount" }, 400);

    const referer = req.headers.get("origin") || req.headers.get("referer") || "";
    const origin = (() => { try { return new URL(referer).origin; } catch { return ""; } })();
    const returnUrl = `${origin}/boost/payment-return?reg_id=${reg.id}`;

    // Cashfree order_id: max 50 chars, alphanumeric + _-. Prefix to disambiguate from regular orders.
    const cfOrderId = `boost_${reg.id}`;
    const phone = (reg.phone || "9999999999").toString().replace(/\D/g, "").slice(-10) || "9999999999";

    const cfRes = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CF_API_VERSION,
        "x-client-id": APP_ID,
        "x-client-secret": SECRET,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: total,
        order_currency: "INR",
        order_note: `BOOST 2026 registration ${reg.id}`,
        customer_details: {
          customer_id: reg.id,
          customer_name: reg.full_name,
          customer_email: reg.email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: `${SUPABASE_URL}/functions/v1/cashfree-webhook`,
        },
        order_tags: { kind: "boost" },
      }),
    });
    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson.payment_session_id) {
      return json({ error: cfJson.message || "Cashfree order failed", details: cfJson }, 502);
    }

    await admin.from("boost_registrations").update({
      cf_order_id: cfOrderId,
      cf_payment_session_id: cfJson.payment_session_id,
    }).eq("id", reg.id);

    return json({
      registration_id: reg.id,
      payment_session_id: cfJson.payment_session_id,
      env: ENV,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
