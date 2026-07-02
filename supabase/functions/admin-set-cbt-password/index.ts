// Admin/center_admin sets or resets one student's CBT password.
// Body: { user_id: string, password?: string }  // password optional -> auto-generate
// Returns: { password: string }
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
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Unauthorized" });

    const admin = createClient(url, service);
    const { data: userRes, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !userRes?.user) return json(401, { error: "Unauthorized" });

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("super_admin") && !roleSet.has("center_admin")) {
      return json(403, { error: "Forbidden" });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id ?? "");
    if (!userId) return json(400, { error: "Missing user_id" });
    let password = String(body?.password ?? "").trim();
    if (password && password.length < 6) return json(400, { error: "Password must be at least 6 characters" });
    if (!password) password = genPassword(8);

    const { error: aErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (aErr) return json(500, { error: aErr.message });

    await admin.from("profiles").update({ cbt_password_set_at: new Date().toISOString() }).eq("user_id", userId);

    return json(200, { password });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
