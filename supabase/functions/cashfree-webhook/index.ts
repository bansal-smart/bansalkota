// Cashfree webhook receiver (signature verified)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("CASHFREE_SECRET_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") || "";
  const timestamp = req.headers.get("x-webhook-timestamp") || "";

  if (!signature || !timestamp) return new Response("Missing signature", { status: 400 });

  // Verify HMAC-SHA256(timestamp + rawBody, CASHFREE_SECRET_KEY), base64
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(timestamp + rawBody));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    if (expected !== signature) {
      console.warn("Signature mismatch", { expected, got: signature });
      return new Response("Bad signature", { status: 401 });
    }
  } catch (e) {
    console.error("sig verify error", e);
    return new Response("Signature error", { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

  const type = payload?.type as string;
  const data = payload?.data || {};
  const cfOrder = data?.order || {};
  const cfPayment = data?.payment || {};
  const orderId: string | undefined = cfOrder?.order_id; // we set this to our public.orders.id
  const paymentId: string | undefined = cfPayment?.cf_payment_id?.toString();
  const paymentStatus: string | undefined = cfPayment?.payment_status; // SUCCESS / FAILED / USER_DROPPED / PENDING

  if (!orderId) {
    console.warn("No order_id in webhook");
    return new Response("ok", { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);


  // Branch: BOOST registration payments use order_id prefix "boost_<uuid>"
  if (orderId.startsWith("boost_")) {
    const regId = orderId.slice("boost_".length);
    const { data: reg } = await admin
      .from("boost_registrations")
      .select("id, payment_status")
      .eq("id", regId)
      .maybeSingle();
    if (!reg) {
      console.warn("BOOST registration not found", regId);
      return new Response("ok", { status: 200 });
    }
    if (type === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS" && reg.payment_status !== "paid") {
      await admin.from("boost_registrations").update({
        payment_status: "paid",
        status: "confirmed",
        payment_ref: paymentId ?? null,
        paid_at: new Date().toISOString(),
      }).eq("id", reg.id);
    } else if ((type === "PAYMENT_FAILED_WEBHOOK" || type === "PAYMENT_USER_DROPPED_WEBHOOK") && reg.payment_status === "pending") {
      await admin.from("boost_registrations").update({
        payment_status: "failed",
        payment_ref: paymentId ?? null,
      }).eq("id", reg.id);
    }
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Fetch order + items + user
  const { data: order } = await admin
    .from("orders").select("id, user_id, total, currency, status").eq("id", orderId).maybeSingle();
  if (!order) {
    console.warn("Order not found", orderId);
    return new Response("ok", { status: 200 });
  }


  // Upsert payment row (idempotent on gateway + external_id)
  if (paymentId) {
    const newStatus =
      paymentStatus === "SUCCESS" ? "succeeded" :
      paymentStatus === "FAILED" ? "failed" :
      paymentStatus === "USER_DROPPED" ? "cancelled" :
      "pending";

    await admin.from("payments").upsert({
      user_id: order.user_id,
      amount: cfPayment.payment_amount ?? order.total,
      currency: cfPayment.payment_currency ?? order.currency,
      gateway: "cashfree",
      external_id: paymentId,
      status: newStatus,
      metadata: { type, order_id: orderId, payload: data },
    }, { onConflict: "gateway,external_id" });
  }

  // Handle success
  if (type === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS" && order.status !== "paid") {
    await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

    // Reflect on linked course enquiry, if any.
    await admin.from("course_enquiries").update({
      payment_status: "paid",
      payment_id: paymentId ?? null,
      paid_at: new Date().toISOString(),
      status: "converted",
    }).eq("payment_order_id", order.id);

    // For course / test_series items, create enrollments + notification
    const { data: items } = await admin
      .from("order_items").select("item_type, item_id, item_title").eq("order_id", order.id);

    for (const it of items || []) {
      if (it.item_type === "course") {
        await admin.from("enrollments").upsert({
          user_id: order.user_id,
          course_id: it.item_id,
          is_active: true,
          last_accessed_at: new Date().toISOString(),
        }, { onConflict: "user_id,course_id" });
      }
      await admin.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment successful",
        body: `Your payment for ${it.item_title} is confirmed.`,
        type: it.item_type === "course" ? "course" : "order",
        link: it.item_type === "course" ? "/my-courses" : "/orders",
      });
    }

    // Send PRPSMS payment confirmation SMS (non-fatal)
    try {
      const { data: profile } = await admin
        .from("profiles").select("full_name, phone_e164, phone").eq("user_id", order.user_id).maybeSingle();
      const phone = profile?.phone_e164 || profile?.phone;
      const firstItem = (items || [])[0];
      if (phone && firstItem) {
        await admin.functions.invoke("prpsms-send-transactional", {
          body: {
            to_phone: phone,
            template_name: "Payment Confirmation-1",
            vars: {
              name: profile?.full_name || "Student",
              test_date: firstItem.item_title || "your course",
              time_slot: "as scheduled",
            },
            purpose: "enrollment_confirmation",
          },
        });
      }
    } catch (smsErr) {
      console.error("PRPSMS SMS failed (non-fatal)", smsErr);
    }
  } else if (type === "PAYMENT_FAILED_WEBHOOK" || type === "PAYMENT_USER_DROPPED_WEBHOOK") {
    if (order.status === "pending") {
      await admin.from("orders").update({
        status: type === "PAYMENT_FAILED_WEBHOOK" ? "failed" : "cancelled",
      }).eq("id", order.id);
    }
    // Flip enquiry to failed too (only if it isn't already paid).
    await admin.from("course_enquiries").update({
      payment_status: "failed",
      payment_id: paymentId ?? null,
    }).eq("payment_order_id", order.id).neq("payment_status", "paid");
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
