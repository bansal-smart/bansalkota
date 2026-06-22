// Sends "Result" DLT template to all students who submitted a given test.
// Triggered by the admin "Release Results" action.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { prpsmsSend, renderTemplate, toDestNumber } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { test_id } = await req.json().catch(() => ({})) as { test_id?: string };
    if (!test_id) {
      return new Response(JSON.stringify({ error: "test_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch test
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, title, starts_at, ends_at")
      .eq("id", test_id)
      .maybeSingle();
    if (testErr) throw testErr;
    if (!test) {
      return new Response(JSON.stringify({ error: "Test not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch submitted attempts, highest score first
    const { data: attempts, error: aErr } = await supabase
      .from("test_attempts")
      .select("id, user_id, score")
      .eq("test_id", test_id)
      .eq("status", "submitted")
      .order("score", { ascending: false, nullsFirst: false });
    if (aErr) throw aErr;

    const submitted = (attempts || []).filter((a) => a.score !== null && a.user_id);
    if (submitted.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No submitted attempts" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Best attempt per user (already sorted desc by score)
    const bestByUser = new Map<string, { score: number; rank: number }>();
    for (const a of submitted) {
      if (!bestByUser.has(a.user_id)) bestByUser.set(a.user_id, { score: Number(a.score), rank: 0 });
    }
    // Rank by score (dense rank: ties share rank)
    const ranked = Array.from(bestByUser.entries()).sort((a, b) => b[1].score - a[1].score);
    let prevScore: number | null = null;
    let rank = 0;
    let i = 0;
    for (const [uid, v] of ranked) {
      i += 1;
      if (prevScore === null || v.score !== prevScore) rank = i;
      bestByUser.set(uid, { score: v.score, rank });
      prevScore = v.score;
    }

    // Fetch profiles
    const userIds = Array.from(bestByUser.keys());
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone_e164, phone")
      .in("user_id", userIds);
    if (pErr) throw pErr;

    const dateStr = new Date(test.starts_at || test.ends_at || Date.now())
      .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const totalCount = ranked.length;

    for (const profile of (profiles || [])) {
      const stats = bestByUser.get(profile.user_id);
      if (!stats) continue;
      const phoneRaw = profile.phone_e164 || profile.phone;
      if (!phoneRaw) { failed++; continue; }
      let dest: string;
      try { dest = toDestNumber(phoneRaw); } catch { failed++; continue; }

      const name = profile.full_name || "Student";
      const body = renderTemplate("Result", {
        name,
        test_name: test.title,
        date: dateStr,
        score: `Score ${stats.score}`,
        rank: `Rank ${stats.rank}/${totalCount}`,
      });

      const res = await prpsmsSend({ to: dest, body });
      // Log
      await supabase.from("sms_send_log").insert({
        recipient_phone: `+91${dest}`,
        template_name: "Result",
        purpose: "result_release",
        body,
        status: res.ok ? "sent" : "failed",
        provider_msg_id: res.msg_id ?? null,
        provider_response: res.raw,
        error_message: res.ok ? null : res.error,
        user_id: profile.user_id,
      });
      if (res.ok) sent++; else { failed++; if (errors.length < 5 && res.error) errors.push(res.error); }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: totalCount, errors }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
