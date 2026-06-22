// Cashfree: create payment order + payment session
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const SECRET = Deno.env.get("CASHFREE_SECRET_KEY")!;
const ENV = (Deno.env.get("CASHFREE_ENV") || "sandbox").toLowerCase();
const CF_BASE = ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
const CF_API_VERSION = "2025-01-01";

type CartItem = { type: "book" | "pack"; id: string; quantity: number };
type Shipping = {
  name: string; phone: string; address: string;
  city: string; state: string; pincode: string;
};
type Body =
  | { orderType: "cart"; items: CartItem[]; shipping: Shipping }
  | { orderType: "course"; courseId: string }
  | { orderType: "test_series"; testSeriesId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;

    const body = (await req.json()) as Body;

    // Pull profile (for customer name + phone)
    const { data: profile } = await admin
      .from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
    const customerName = profile?.full_name || user.user_metadata?.full_name || "Learner";
    const customerPhone = (profile?.phone || user.user_metadata?.phone || "9999999999").toString().slice(-10) || "9999999999";

    // Build order from server-side prices
    let subtotal = 0;
    let shippingFee = 0;
    const items: Array<{ item_type: string; item_id: string; item_title: string; unit_price: number; quantity: number }> = [];
    let orderNotes = "";
    let returnLabel = "Order";

    if (body.orderType === "cart") {
      if (!body.items?.length) return json({ error: "Cart empty" }, 400);

      const bookIds = body.items.filter((i) => i.type === "book").map((i) => i.id);
      const packIds = body.items.filter((i) => i.type === "pack").map((i) => i.id);

      const [{ data: books }, { data: packs }] = await Promise.all([
        bookIds.length
          ? admin.from("books").select("id, title, price").in("id", bookIds)
          : Promise.resolve({ data: [] as any[] }),
        packIds.length
          ? admin.from("module_packs").select("id, title, price").in("id", packIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      for (const ci of body.items) {
        const src = ci.type === "book" ? (books || []).find((b: any) => b.id === ci.id) : (packs || []).find((p: any) => p.id === ci.id);
        if (!src) return json({ error: `Item not found: ${ci.id}` }, 400);
        const qty = Math.max(1, Math.floor(ci.quantity || 1));
        const price = Number(src.price);
        subtotal += price * qty;
        items.push({ item_type: ci.type, item_id: ci.id, item_title: src.title, unit_price: price, quantity: qty });
      }
      shippingFee = subtotal >= 500 ? 0 : 60;
      returnLabel = "E-Store order";
    } else if (body.orderType === "course") {
      const { data: course, error } = await admin
        .from("courses").select("id, name, price").eq("id", body.courseId).maybeSingle();
      if (error || !course) return json({ error: "Course not found" }, 404);
      subtotal = Number(course.price || 0);
      items.push({ item_type: "course", item_id: course.id, item_title: course.name, unit_price: subtotal, quantity: 1 });
      orderNotes = `Course enrollment: ${course.name}`;
      returnLabel = course.name;
    } else if (body.orderType === "test_series") {
      const { data: ts, error } = await admin
        .from("test_series").select("id, title, price").eq("id", body.testSeriesId).maybeSingle();
      if (error || !ts) return json({ error: "Test series not found" }, 404);
      subtotal = Number(ts.price || 0);
      items.push({ item_type: "test_series", item_id: ts.id, item_title: ts.title, unit_price: subtotal, quantity: 1 });
      orderNotes = `Test series: ${ts.title}`;
      returnLabel = ts.title;
    } else {
      return json({ error: "Invalid orderType" }, 400);
    }

    const total = +(subtotal + shippingFee).toFixed(2);
    if (total <= 0) return json({ error: "Invalid amount" }, 400);

    // Insert order
    const shipping = body.orderType === "cart" ? body.shipping : null;
    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        shipping_fee: shippingFee,
        total,
        currency: "INR",
        provider: "cashfree",
        notes: orderNotes || null,
        shipping_name: shipping?.name ?? null,
        shipping_phone: shipping?.phone ?? null,
        shipping_address: shipping?.address ?? null,
        shipping_city: shipping?.city ?? null,
        shipping_state: shipping?.state ?? null,
        shipping_pincode: shipping?.pincode ?? null,
      })
      .select("id")
      .single();
    if (oErr || !order) return json({ error: oErr?.message || "Order create failed" }, 500);

    const { error: itemsErr } = await admin
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));
    if (itemsErr) return json({ error: "Order items failed: " + itemsErr.message }, 500);

    // Build return URL from referer
    const referer = req.headers.get("origin") || req.headers.get("referer") || "";
    const origin = (() => { try { return new URL(referer).origin; } catch { return ""; } })();
    const returnUrl = `${origin}/payments/return?order_id=${order.id}`;

    // Call Cashfree
    const cfRes = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CF_API_VERSION,
        "x-client-id": APP_ID,
        "x-client-secret": SECRET,
      },
      body: JSON.stringify({
        order_id: order.id,
        order_amount: total,
        order_currency: "INR",
        order_note: orderNotes || returnLabel,
        customer_details: {
          customer_id: user.id,
          customer_name: customerName,
          customer_email: user.email,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: `${SUPABASE_URL}/functions/v1/cashfree-webhook`,
        },
      }),
    });
    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson.payment_session_id) {
      await admin.from("orders").update({ status: "failed", notes: `cf_create_failed: ${JSON.stringify(cfJson)}` }).eq("id", order.id);
      return json({ error: cfJson.message || "Cashfree order failed", details: cfJson }, 502);
    }

    await admin.from("orders").update({
      cf_order_id: cfJson.cf_order_id?.toString() ?? null,
      cf_payment_session_id: cfJson.payment_session_id,
    }).eq("id", order.id);

    return json({
      order_id: order.id,
      payment_session_id: cfJson.payment_session_id,
      cf_order_id: cfJson.cf_order_id,
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
