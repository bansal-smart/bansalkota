// Student changes their own CBT password.
// Body: { current_password: string, new_password: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Unauthorized" });

    const admin = createClient(url, service);
    const { data: userRes, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !userRes?.user?.email) return json(401, { error: "Unauthorized" });
    const userId = userRes.user.id;
    const email = userRes.user.email;

    const body = await req.json().catch(() => ({}));
    const current = String(body?.current_password ?? "");
    const next = String(body?.new_password ?? "");
    if (!current || !next) return json(400, { error: "Missing password fields" });
    if (next.length < 6) return json(400, { error: "New password must be at least 6 characters" });

    // Verify current by attempting sign-in with anon client.
    const check = createClient(url, anon);
    const { error: sErr } = await check.auth.signInWithPassword({ email, password: current });
    if (sErr) return json(401, { error: "Current password is incorrect" });

    const { error: aErr } = await admin.auth.admin.updateUserById(userId, { password: next });
    if (aErr) return json(500, { error: aErr.message });

    await admin.from("profiles").update({ cbt_password_set_at: new Date().toISOString() }).eq("user_id", userId);

    return json(200, { success: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
