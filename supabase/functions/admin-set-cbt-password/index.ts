// Admin/center_admin sets or resets one student's CBT password.
// Body: { user_id: string, password?: string }  // password optional -> auto-generate
// Returns: { password: string }
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
// full 8-digit number (avoids Excel/Sheets stripping a leading zero on export).
const genPassword = (): string => {
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  let out = String(1 + (buf[0] % 9));
  for (let i = 1; i < 8; i++) out += String(buf[i] % 10);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Unauthorized" });

    const admin = createClient(url, service);
    const access = await resolveCallerAccess(admin, token).catch(() => null);
    if (!access) return json(401, { error: "Unauthorized" });
    if (!access.isAdminOrSuper && access.centreIds.size === 0) {
      return json(403, { error: "Forbidden" });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id ?? "");
    if (!userId) return json(400, { error: "Missing user_id" });

    // Centre admins may only touch students mapped to a centre they staff.
    if (!access.isAdminOrSuper) {
      const { data: target } = await admin.from("profiles").select("centre_id").eq("user_id", userId).maybeSingle();
      if (!target?.centre_id || !access.centreIds.has(target.centre_id)) {
        return json(403, { error: "That student is not in your centre" });
      }
    }

    let password = String(body?.password ?? "").trim();
    if (password && password.length < 6) return json(400, { error: "Password must be at least 6 characters" });
    if (!password) password = genPassword();

    const { error: aErr } = await withAuthRetry(() => admin.auth.admin.updateUserById(userId, { password }));
    if (aErr) return json(500, { error: aErr.message });

    await admin.from("profiles").update({ cbt_password_set_at: new Date().toISOString() }).eq("user_id", userId);

    return json(200, { password });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
