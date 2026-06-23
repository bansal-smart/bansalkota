// Sends "Result" DLT template to all students on the test roster
// (both present and absent). Triggered manually by the admin
// "Send Result SMS" button on the result page.
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

    // Use the same RPC the admin result page uses so the recipient list
    // exactly matches what the admin sees (present + absent).
    const { data: sheet, error: rpcErr } = await (supabase.rpc as any)(
      "admin_test_result_sheet",
      { _test_id: test_id },
    );
    if (rpcErr) throw rpcErr;
    const sheetRows = (sheet || []) as Array<{
      user_id: string;
      full_name: string | null;
      total_score: number | null;
      rank_label: string | null;
      rank_num: number | null;
      status: "present" | "absent";
    }>;

    if (sheetRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, total: 0, message: "No students on roster" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Phone numbers
    const userIds = sheetRows.map((r) => r.user_id);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone_e164, phone")
      .in("user_id", userIds);
    if (pErr) throw pErr;
    const profMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profMap.set(p.user_id, p));

    const presentTotal = sheetRows.filter((r) => r.status === "present").length;

    const dateStr = new Date(test.starts_at || test.ends_at || Date.now())
      .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    let sent = 0;
    let failed = 0;
    let absentSent = 0;
    const errors: string[] = [];

    for (const row of sheetRows) {
      const profile = profMap.get(row.user_id);
      if (!profile) { failed++; continue; }
      const phoneRaw = profile.phone_e164 || profile.phone;
      if (!phoneRaw) { failed++; continue; }
      let dest: string;
      try { dest = toDestNumber(phoneRaw); } catch { failed++; continue; }

      const name = row.full_name || profile.full_name || "Student";
      const isAbsent = row.status === "absent";
      const scoreField = isAbsent ? "Absent" : `Score ${row.total_score ?? 0}`;
      const rankField = isAbsent
        ? "Absent"
        : `Rank ${row.rank_label || row.rank_num || "—"}/${presentTotal}`;

      const body = renderTemplate("Result", {
        name,
        test_name: test.title,
        date: dateStr,
        score: scoreField,
        rank: rankField,
      });

      const res = await prpsmsSend({ to: dest, body });
      await supabase.from("sms_send_log").insert({
        recipient_phone: `+91${dest}`,
        template_name: "Result",
        purpose: "result_release",
        body,
        status: res.ok ? "sent" : "failed",
        provider_msg_id: res.msg_id ?? null,
        provider_response: res.raw,
        error_message: res.ok ? null : res.error,
        user_id: row.user_id,
      });
      if (res.ok) {
        sent++;
        if (isAbsent) absentSent++;
      } else {
        failed++;
        if (errors.length < 5 && res.error) errors.push(res.error);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, total: sheetRows.length, absent_sent: absentSent, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
