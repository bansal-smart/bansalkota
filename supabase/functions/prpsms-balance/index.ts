import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { prpsmsBalance } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

let cache: { ok: boolean; balance?: number; raw: string; error?: string; at: number } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.replace("Bearer ", "");
    let userId: string | null = null;
    try {
      const { data: claimsData } = await userClient.auth.getClaims(token);
      if (claimsData?.claims?.sub) userId = claimsData.claims.sub as string;
    } catch (_) { /* fall through */ }
    if (!userId) {
      const { data: userData, error } = await userClient.auth.getUser(token);
      if (error || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userId = userData.user.id;
    }
    const { data: ok } = await userClient.rpc("is_admin_or_super", { _user_id: userId });
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    if (!force && cache && Date.now() - cache.at < 5 * 60_000) {
      return new Response(JSON.stringify({ ...cache, cached: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const r = await prpsmsBalance();
    cache = { ...r, at: Date.now() };
    return new Response(JSON.stringify({ ...r, fetched_at: new Date().toISOString(), cached: false }), { status: r.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
