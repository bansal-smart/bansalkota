// Shared helper: write Cashfree payment events into public.payments, the ledger
// behind Super Admin → Payments & Revenue.
//
// Deliberately select-then-insert/update instead of .upsert(): PostgREST upsert
// needs ON CONFLICT inference, which is what silently broke this before.
// Never throws — returns false on failure so callers can decide (the webhook
// answers 500 so Cashfree retries).

// deno-lint-ignore no-explicit-any
type Admin = any;

export type PaymentStatus = "success" | "failed" | "pending" | "refunded";

export function mapCashfreeStatus(s?: string | null): PaymentStatus {
  switch ((s || "").toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "FAILED":
    case "USER_DROPPED":
    case "CANCELLED":
    case "VOID":
      return "failed";
    default:
      return "pending";
  }
}

// Out-of-order / repeated events must never downgrade a settled payment.
const RANK: Record<string, number> = { pending: 0, failed: 1, success: 2, refunded: 3 };

export type PaymentInput = {
  orderRef: string; // Cashfree order_id: orders.id (uuid) or "boost_<uuid>"
  externalId: string | null | undefined; // cf_payment_id
  userId?: string | null;
  studentName?: string | null;
  plan?: string | null;
  amount: number;
  currency?: string | null;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
};

export async function recordPayment(admin: Admin, p: PaymentInput): Promise<boolean> {
  if (!p.externalId) return true; // nothing to key on (e.g. order created, no attempt yet)
  const gateway = "cashfree";
  try {
    let { data: existing } = await admin
      .from("payments")
      .select("id, status")
      .eq("gateway", gateway)
      .eq("external_id", p.externalId)
      .maybeSingle();

    if (!existing) {
      // Adopt a row created by the backfill (same order, no payment id yet).
      const { data: adopted } = await admin
        .from("payments")
        .select("id, status")
        .eq("gateway", gateway)
        .eq("order_ref", p.orderRef)
        .is("external_id", null)
        .limit(1)
        .maybeSingle();
      existing = adopted;
    }

    const row = {
      user_id: p.userId ?? null,
      student_name: p.studentName ?? null,
      plan: p.plan ?? null,
      amount: p.amount,
      currency: p.currency || "INR",
      gateway,
      external_id: p.externalId,
      order_ref: p.orderRef,
      metadata: p.metadata ?? {},
    };

    if (existing) {
      const keep = (RANK[existing.status] ?? 0) > (RANK[p.status] ?? 0);
      const { error } = await admin
        .from("payments")
        .update({ ...row, status: keep ? existing.status : p.status })
        .eq("id", existing.id);
      if (error) throw error;
      return true;
    }

    const { error } = await admin.from("payments").insert({ ...row, status: p.status });
    if (error) {
      // Lost a race with a concurrent webhook/verify call: fall back to update.
      if (error.code === "23505") {
        const { error: upErr } = await admin
          .from("payments")
          .update({ ...row, status: p.status })
          .eq("gateway", gateway)
          .eq("external_id", p.externalId)
          .neq("status", "refunded")
          .neq("status", "success");
        if (upErr) throw upErr;
        return true;
      }
      throw error;
    }
    return true;
  } catch (e) {
    console.error("recordPayment failed", { orderRef: p.orderRef, externalId: p.externalId, error: e });
    return false;
  }
}

// Student name + plan label for a regular (orders table) order.
export async function describeOrder(
  admin: Admin,
  orderId: string,
  userId: string | null,
): Promise<{ studentName: string | null; plan: string | null }> {
  let studentName: string | null = null;
  let plan: string | null = null;
  try {
    if (userId) {
      const { data: prof } = await admin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
      studentName = prof?.full_name ?? null;
    }
    const { data: items } = await admin.from("order_items").select("item_title").eq("order_id", orderId);
    plan = (items || []).map((i: { item_title: string }) => i.item_title).filter(Boolean).join(", ") || null;
  } catch (e) {
    console.error("describeOrder failed (non-fatal)", e);
  }
  return { studentName, plan };
}
