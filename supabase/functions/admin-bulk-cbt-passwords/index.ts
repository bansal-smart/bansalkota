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

const MAX_PER_REQUEST = 40;
const PROFILE_IN_CHUNK = 80;

type AdminClient = ReturnType<typeof createClient>;

type ProfileRow = {
  user_id: string;
  centre_id: string | null;
  roll_number: string | null;
  full_name: string | null;
  cbt_password_set_at: string | null;
  batch_label: string | null;
  phone: string | null;
  centres?: { city?: string | null; area?: string | null } | null;
};

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

const centreLabel = (p: ProfileRow): string | null => {
  const c = p.centres;
  if (!c) return null;
  const parts = [c.area, c.city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

const cbtEmailFor = (p: ProfileRow): string => {
  const seed = p.roll_number
    ? `roll-${p.roll_number}`
    : p.phone
      ? `phone-${p.phone}`
      : `cbt-${p.user_id.replace(/-/g, "").slice(0, 12)}`;
  return `${seed}@bansal.ac.in`.toLowerCase().replace(/[^a-z0-9@.\-]/g, "");
};

const isMissingUserError = (msg?: string | null) =>
  !!msg && /user not found|unable to find user|could not find user/i.test(msg);

async function fetchProfilesByIds(admin: AdminClient, userIds: string[]): Promise<ProfileRow[]> {
  const out: ProfileRow[] = [];
  for (let i = 0; i < userIds.length; i += PROFILE_IN_CHUNK) {
    const slice = userIds.slice(i, i + PROFILE_IN_CHUNK);
    const { data, error } = await admin
      .from("profiles")
      .select("user_id, centre_id, roll_number, full_name, cbt_password_set_at, batch_label, phone, centres:centre_id(city, area)")
      .in("user_id", slice);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as ProfileRow[]));
  }
  return out;
}

async function ensureAuthUserWithPassword(
  admin: AdminClient,
  p: ProfileRow,
  pwd: string,
): Promise<{ error: { message: string } | null }> {
  const updated = await withAuthRetry(() => admin.auth.admin.updateUserById(p.user_id, { password: pwd }));
  if (!updated.error) return { error: null };
  if (!isMissingUserError(updated.error.message)) return { error: updated.error };

  // Profile exists but Auth user was never created (common after a partial bulk import).
  const created = await withAuthRetry(() =>
    admin.auth.admin.createUser({
      id: p.user_id,
      email: cbtEmailFor(p),
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: p.full_name, source: "cbt_password_backfill" },
    }),
  );
  if (!created.error) return { error: null };

  // Email may already belong to another Auth user — retry with a unique address.
  if (/already been registered|already exists|duplicate/i.test(created.error.message)) {
    const retry = await withAuthRetry(() =>
      admin.auth.admin.createUser({
        id: p.user_id,
        email: `cbt-${p.user_id.replace(/-/g, "")}@bansal.ac.in`,
        password: pwd,
        email_confirm: true,
        user_metadata: { full_name: p.full_name, source: "cbt_password_backfill" },
      }),
    );
    return { error: retry.error };
  }
  return { error: created.error };
}

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
    const userIds: string[] = Array.from(
      new Set((Array.isArray(body?.user_ids) ? body.user_ids : []).map(String).filter(Boolean)),
    );
    const overwrite: boolean = body?.overwrite === true;
    const usedPasswords = new Set<string>(
      Array.isArray(body?.exclude_passwords) ? body.exclude_passwords.map(String) : [],
    );
    if (!userIds.length) return json(400, { error: "No user_ids provided" });
    if (userIds.length > MAX_PER_REQUEST) {
      return json(400, { error: `Max ${MAX_PER_REQUEST} students per request` });
    }

    const profs = await fetchProfilesByIds(admin, userIds);
    const byId = new Map(profs.map((p) => [p.user_id, p]));

    const scopedProfs: ProfileRow[] = [];
    const outOfScopeIds: string[] = [];
    const missingIds: string[] = [];

    for (const uid of userIds) {
      const p = byId.get(uid);
      if (!p) {
        missingIds.push(uid);
        continue;
      }
      if (!access.isAdminOrSuper && !(p.centre_id && access.centreIds.has(p.centre_id))) {
        outOfScopeIds.push(uid);
        continue;
      }
      scopedProfs.push(p);
    }

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
      const centre = centreLabel(p);

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

      const { error: aErr } = await ensureAuthUserWithPassword(admin, p, pwd);
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
      const p = byId.get(uid);
      results.push({
        user_id: uid,
        roll_number: p?.roll_number ?? null,
        full_name: p?.full_name ?? null,
        centre: p ? centreLabel(p) : null,
        batch: p?.batch_label ?? null,
        password: null,
        status: "forbidden_wrong_centre",
      });
    }
    for (const uid of missingIds) {
      results.push({
        user_id: uid,
        roll_number: null,
        full_name: null,
        centre: null,
        batch: null,
        password: null,
        status: "error: profile not found",
      });
    }

    return json(200, {
      results,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped_existing").length,
      errors: results.filter((r) => r.status !== "generated" && r.status !== "skipped_existing").length,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
