// Bulk-generate CBT passwords for students. Admin/super_admin/center_admin only.
// Body: { user_ids: string[], overwrite?: boolean, exclude_passwords?: string[] }
// exclude_passwords lets the caller carry forward passwords already issued in earlier
// chunks of the same bulk run, so uniqueness holds across the whole batch, not just
// within a single invocation.
// Returns: { results: [{ user_id, roll_number, full_name, password | null, status }], generated: n }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveCallerAccess } from "../_shared/authz.ts";
import { withAuthRetry } from "../_shared/retry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Numeric-only, 8 digits, first digit never 0 so the value always displays as a
// full 8-digit number (avoids Excel/Sheets stripping a leading zero on CSV export).
const genPassword = (): string => {
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  let out = String(1 + (buf[0] % 9));
  for (let i = 1; i < 8; i++) out += String(buf[i] % 10);
  return out;
};

const genUniquePassword = (used: Set<string>): string => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pwd = genPassword();
    if (!used.has(pwd)) {
      used.add(pwd);
      return pwd;
    }
  }
  throw new Error("Could not generate a unique password — try again");
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
    const access = await resolveCallerAccess(admin, token).catch(() => null);
    if (!access) return json(401, { error: "Unauthorized" });
    if (!access.isAdminOrSuper && access.centreIds.size === 0) {
      return json(403, { error: "Forbidden" });
    }

    const body = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids : [];
    const overwrite: boolean = body?.overwrite === true;
    const usedPasswords = new Set<string>(
      Array.isArray(body?.exclude_passwords) ? body.exclude_passwords.map(String) : [],
    );
    if (!userIds.length) return json(400, { error: "No user_ids provided" });

    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("user_id, centre_id, roll_number, full_name, cbt_password_set_at, batch_label, centres:centre_id(city, area)")
      .in("user_id", userIds);
    if (pErr) return json(500, { error: pErr.message });

    // Centre admins may only touch students mapped to a centre they staff.
    // Split rather than silently drop so the response accounts for every
    // requested id (the caller already knows these ids — they sent them).
    const scopedProfs = access.isAdminOrSuper
      ? (profs ?? [])
      : (profs ?? []).filter((p) => p.centre_id && access.centreIds.has(p.centre_id));
    const outOfScopeIds = access.isAdminOrSuper
      ? []
      : (profs ?? [])
          .filter((p) => !(p.centre_id && access.centreIds.has(p.centre_id)))
          .map((p) => p.user_id);

    const results: Array<{
      user_id: string;
      roll_number: string | null;
      full_name: string | null;
      centre: string | null;
      batch: string | null;
      password: string | null;
      status: string;
    }> = [];

    for (const p of scopedProfs) {
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

      let pwd: string;
      try {
        pwd = genUniquePassword(usedPasswords);
      } catch (genErr) {
        results.push({
          user_id: p.user_id,
          roll_number: p.roll_number ?? null,
          full_name: p.full_name ?? null,
          centre,
          batch: p.batch_label ?? null,
          password: null,
          status: `error: ${genErr instanceof Error ? genErr.message : String(genErr)}`,
        });
        continue;
      }
      const { error: aErr } = await withAuthRetry(() => admin.auth.admin.updateUserById(p.user_id, { password: pwd }));
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

    for (const uid of outOfScopeIds) {
      results.push({
        user_id: uid,
        roll_number: null,
        full_name: null,
        centre: null,
        batch: null,
        password: null,
        status: "forbidden_wrong_centre",
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
