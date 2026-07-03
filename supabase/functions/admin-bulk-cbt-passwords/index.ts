// Bulk-generate CBT passwords for students. Admin/super_admin/center_admin only.
// Body: { user_ids: string[], overwrite?: boolean }
// Returns: { results: [{ user_id, roll_number, full_name, password | null, status }], generated: n }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const genPassword = (len = 8) => {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Unauthorized" });

    const admin = createClient(url, service);
    const { data: userRes, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !userRes?.user) return json(401, { error: "Unauthorized" });
    const callerId = userRes.user.id;

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("super_admin") && !roleSet.has("center_admin")) {
      return json(403, { error: "Forbidden" });
    }

    const body = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids : [];
    const overwrite: boolean = body?.overwrite === true;
    if (!userIds.length) return json(400, { error: "No user_ids provided" });

    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("user_id, roll_number, full_name, cbt_password_set_at, batch_label, centres:centre_id(city, area)")
      .in("user_id", userIds);
    if (pErr) return json(500, { error: pErr.message });

    const results: Array<{
      user_id: string;
      roll_number: string | null;
      full_name: string | null;
      centre: string | null;
      batch: string | null;
      password: string | null;
      status: string;
    }> = [];

    for (const p of profs ?? []) {
      const alreadySet = !!p.cbt_password_set_at;
      const centre = (p as any).centres
        ? [(p as any).centres.area, (p as any).centres.city].filter(Boolean).join(", ")
        : null;

      if (alreadySet && !overwrite) {
        results.push({
          user_id: p.user_id,
          roll_number: p.roll_number ?? null,
          full_name: p.full_name ?? null,
          centre,
          batch: p.batch_label ?? null,
          password: null,
          status: "skipped_existing",
        });
        continue;
      }

      const pwd = genPassword(8);
      const { error: aErr } = await admin.auth.admin.updateUserById(p.user_id, { password: pwd });
      if (aErr) {
        results.push({
          user_id: p.user_id,
          roll_number: p.roll_number ?? null,
          full_name: p.full_name ?? null,
          centre,
          batch: p.batch_label ?? null,
          password: null,
          status: `error: ${aErr.message}`,
        });
        continue;
      }
      await admin.from("profiles").update({ cbt_password_set_at: new Date().toISOString() }).eq("user_id", p.user_id);
      results.push({
        user_id: p.user_id,
        roll_number: p.roll_number ?? null,
        full_name: p.full_name ?? null,
        centre,
        batch: p.batch_label ?? null,
        password: pwd,
        status: "generated",
      });
    }

    return json(200, {
      results,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped_existing").length,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
