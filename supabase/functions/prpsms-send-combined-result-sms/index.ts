// Sends the "Result" DLT template with a combined-paper breakdown (P1 + P2
// summed per subject) to every student on either paper's roster. Mirrors
// prpsms-send-result-sms, but merges two test rosters the same way
// AdminCombinedResultPage.tsx does (by roll_number, falling back to user_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { prpsmsSend, renderTemplate, toDestNumber } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SheetRow = {
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  subjects: Record<string, number> | null;
  total_score: number | null;
  status: "present" | "absent";
};

const SUBJECT_ORDER = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
const subjectCode = (subject: string): string => subject.trim().charAt(0).toUpperCase() || "?";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { test_id, partner_test_id } = await req.json().catch(() => ({})) as { test_id?: string; partner_test_id?: string };
    if (!test_id || !partner_test_id) {
      return new Response(JSON.stringify({ error: "test_id and partner_test_id are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const supabaseAsUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabaseAsUser.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAllowed, error: roleErr } = await supabaseAsUser.rpc("is_admin_or_super", { _user_id: userData.user.id });
    if (roleErr) throw roleErr;
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tests, error: testErr } = await supabase
      .from("tests")
      .select("id, title, starts_at, ends_at, total_marks")
      .in("id", [test_id, partner_test_id]);
    if (testErr) throw testErr;
    const test1 = (tests || []).find((t: any) => t.id === test_id);
    const test2 = (tests || []).find((t: any) => t.id === partner_test_id);
    if (!test1 || !test2) {
      return new Response(JSON.stringify({ error: "Test not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [r1, r2] = await Promise.all([
      (supabaseAsUser.rpc as any)("admin_test_result_sheet", { _test_id: test_id }),
      (supabaseAsUser.rpc as any)("admin_test_result_sheet", { _test_id: partner_test_id }),
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    const rows1 = (r1.data || []) as SheetRow[];
    const rows2 = (r2.data || []) as SheetRow[];

    if (rows1.length === 0 && rows2.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, total: 0, message: "No students on either roster" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Per-subject max marks, summed across BOTH papers' question sets.
    const { data: questionRows, error: qErr } = await supabase
      .from("test_questions")
      .select("test_id, subject, marks_correct")
      .in("test_id", [test_id, partner_test_id]);
    if (qErr) throw qErr;
    const subjectMax = new Map<string, number>();
    (questionRows || []).forEach((q: any) => {
      const subj = String(q.subject ?? "").trim();
      if (!subj) return;
      subjectMax.set(subj, (subjectMax.get(subj) ?? 0) + Number(q.marks_correct ?? 0));
    });
    const subjectsPresent = Array.from(subjectMax.keys()).sort((a, b) => {
      const ia = SUBJECT_ORDER.indexOf(a);
      const ib = SUBJECT_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });

    // Merge rosters by roll_number (fallback user_id) — same identity rule
    // AdminCombinedResultPage.tsx uses so the SMS recipient list matches the
    // combined result table exactly.
    type Merged = {
      user_id: string;
      full_name: string | null;
      p1?: SheetRow;
      p2?: SheetRow;
      grandTotal: number;
      maxMarks: number;
    };
    const keyOf = (r: SheetRow) => (r.roll_number && r.roll_number.trim() ? `R:${r.roll_number.trim()}` : `U:${r.user_id}`);
    const map = new Map<string, Merged>();
    const upsert = (r: SheetRow, which: 1 | 2) => {
      const k = keyOf(r);
      let m = map.get(k);
      if (!m) {
        m = { user_id: r.user_id, full_name: r.full_name, grandTotal: 0, maxMarks: 0 };
        map.set(k, m);
      }
      if (!m.full_name && r.full_name) m.full_name = r.full_name;
      if (which === 1) m.p1 = r; else m.p2 = r;
    };
    rows1.forEach((r) => upsert(r, 1));
    rows2.forEach((r) => upsert(r, 2));

    const num = (n: any) => (n === null || n === undefined ? 0 : Number(n));
    const merged = Array.from(map.values());
    merged.forEach((m) => {
      const p1Present = m.p1 && m.p1.status === "present";
      const p2Present = m.p2 && m.p2.status === "present";
      let total = 0;
      let maxM = 0;
      if (p1Present) { total += num(m.p1!.total_score); maxM += num(test1.total_marks); }
      if (p2Present) { total += num(m.p2!.total_score); maxM += num(test2.total_marks); }
      m.grandTotal = total;
      m.maxMarks = maxM;
    });

    // Dense rank on grand total, eligible = present on at least one paper.
    const eligible = merged.filter((m) => m.maxMarks > 0).sort((a, b) => b.grandTotal - a.grandTotal);
    const rankOf = new Map<string, number>();
    let prevScore: number | null = null;
    let rank = 0;
    eligible.forEach((m, i) => {
      if (prevScore === null || m.grandTotal !== prevScore) rank = i + 1;
      rankOf.set(m.user_id, rank);
      prevScore = m.grandTotal;
    });

    const buildResultField = (m: Merged): string => {
      if (m.maxMarks === 0) return "Absent";
      const p1Present = m.p1 && m.p1.status === "present";
      const p2Present = m.p2 && m.p2.status === "present";
      const parts = subjectsPresent
        .filter((s) => subjectMax.get(s))
        .map((s) => {
          const score = num(p1Present ? m.p1!.subjects?.[s] : 0) + num(p2Present ? m.p2!.subjects?.[s] : 0);
          return `${subjectCode(s)}=${Math.round(score)}/${subjectMax.get(s)}`;
        });
      const r = rankOf.get(m.user_id);
      return parts.length ? `${parts.join(", ")}, Rank ${r ?? "—"}` : `Score ${m.grandTotal}, Rank ${r ?? "—"}`;
    };

    const testName = `${test1.title} + ${test2.title}`;
    const dateStr = (() => {
      const d = new Date(test2.starts_at || test2.ends_at || test1.starts_at || test1.ends_at || Date.now());
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    })();

    const userIds = merged.map((m) => m.user_id);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone_e164, phone, parent_phone_e164, parent_phone")
      .in("user_id", userIds);
    if (pErr) throw pErr;
    const profMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profMap.set(p.user_id, p));

    let sent = 0;
    let failed = 0;
    let absentSent = 0;
    let parentSent = 0;
    let parentFailed = 0;
    const errors: string[] = [];

    for (const m of merged) {
      const profile = profMap.get(m.user_id);
      if (!profile) { failed++; continue; }
      const phoneRaw = profile.phone_e164 || profile.phone;
      if (!phoneRaw) { failed++; continue; }
      let dest: string;
      try { dest = toDestNumber(phoneRaw); } catch { failed++; continue; }

      const name = m.full_name || profile.full_name || "Student";
      const isAbsent = m.maxMarks === 0;
      const resultField = buildResultField(m);

      const vars = { name, test_name: testName, date: dateStr, result: resultField };
      const body = renderTemplate("Result", vars);

      const res = await prpsmsSend({ to: dest, body });
      await supabase.from("sms_send_log").insert({
        to_phone: `+91${dest}`,
        template_name: "Result",
        vars,
        purpose: "combined_result_release",
        rendered_body: body,
        status: res.ok ? "sent" : "failed",
        provider_msg_id: res.msg_id ?? null,
        error_message: res.ok ? null : res.error,
        sent_by: userData.user.id,
      });
      if (res.ok) {
        sent++;
        if (isAbsent) absentSent++;
      } else {
        failed++;
        if (errors.length < 5 && res.error) errors.push(res.error);
      }

      const parentRaw = profile.parent_phone_e164 || profile.parent_phone;
      if (parentRaw) {
        let parentDest: string | null = null;
        try { parentDest = toDestNumber(parentRaw); } catch { parentDest = null; }
        if (parentDest && parentDest !== dest) {
          const pRes = await prpsmsSend({ to: parentDest, body });
          await supabase.from("sms_send_log").insert({
            to_phone: `+91${parentDest}`,
            template_name: "Result",
            vars,
            purpose: "combined_result_release_parent",
            rendered_body: body,
            status: pRes.ok ? "sent" : "failed",
            provider_msg_id: pRes.msg_id ?? null,
            error_message: pRes.ok ? null : pRes.error,
            sent_by: userData.user.id,
          });
          if (pRes.ok) parentSent++;
          else {
            parentFailed++;
            if (errors.length < 5 && pRes.error) errors.push(`parent: ${pRes.error}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, total: merged.length, absent_sent: absentSent, parent_sent: parentSent, parent_failed: parentFailed, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
