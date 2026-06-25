// Verify a BOOST registration payment by polling latest status (no auth)
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
    const { data: reg } = await admin
      .from("boost_registrations")
      .select("id, admit_card_number, payment_status, cf_order_id, amount")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg) return json({ error: "Registration not found" }, 404);

    // If already marked paid, return.
    if (reg.payment_status === "paid") {
      return json({ status: "paid", admit_card_number: reg.admit_card_number });
    }

    // Ask Cashfree for the latest order status
    const cfOrderId = reg.cf_order_id || `boost_${reg.id}`;
    const cfRes = await fetch(`${CF_BASE}/orders/${cfOrderId}`, {
      headers: {
        "x-api-version": CF_API_VERSION,
        "x-client-id": APP_ID,
        "x-client-secret": SECRET,
      },
    });
    const cf = await cfRes.json();
    const cfStatus: string = cf?.order_status || "";

    let newStatus = reg.payment_status;
    if (cfStatus === "PAID") newStatus = "paid";
    else if (cfStatus === "EXPIRED" || cfStatus === "TERMINATED") newStatus = "failed";

    if (newStatus !== reg.payment_status) {
      const patch: any = { payment_status: newStatus };
      if (newStatus === "paid") {
        patch.paid_at = new Date().toISOString();
        patch.status = "confirmed";
      }
      await admin.from("boost_registrations").update(patch).eq("id", reg.id);
    }

    return json({
      status: newStatus,
      cf_status: cfStatus,
      admit_card_number: reg.admit_card_number,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
