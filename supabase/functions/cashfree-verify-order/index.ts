// Cashfree: verify order status from server (used by return page)
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
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) return json({ error: "Invalid session" }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);

    const { data: order } = await admin
      .from("orders").select("id, user_id, status, total").eq("id", order_id).maybeSingle();
    if (!order || order.user_id !== userData.user.id) return json({ error: "Order not found" }, 404);

    // Fast path: already paid in DB
    if (order.status === "paid") return json({ status: "paid", order });

    // Ask Cashfree
    const r = await fetch(`${CF_BASE}/orders/${order_id}/payments`, {
      headers: {
        "x-api-version": CF_API_VERSION,
        "x-client-id": APP_ID,
        "x-client-secret": SECRET,
      },
    });
    const payments = await r.json();
    let resolved: "paid" | "failed" | "pending" | "cancelled" = "pending";
    if (Array.isArray(payments)) {
      if (payments.some((p) => p.payment_status === "SUCCESS")) resolved = "paid";
      else if (payments.some((p) => p.payment_status === "USER_DROPPED")) resolved = "cancelled";
      else if (payments.length && payments.every((p) => p.payment_status === "FAILED")) resolved = "failed";
    }

    if (resolved === "paid" && order.status !== "paid") {
      await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
      const { data: items } = await admin
        .from("order_items").select("item_type, item_id, item_title").eq("order_id", order.id);
      for (const it of items || []) {
        if (it.item_type === "course") {
          await admin.from("enrollments").upsert({
            user_id: order.user_id, course_id: it.item_id, is_active: true,
            last_accessed_at: new Date().toISOString(),
          }, { onConflict: "user_id,course_id" });
        }
      }
    }

    return json({ status: resolved, order, payments });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
