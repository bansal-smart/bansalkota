import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderTemplate, prpsmsSend, toDestNumber, toE164, TEMPLATES, TemplateName } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Caller passes a broadcast_id. The function expands the audience filter on
// the server, fills sms_broadcast_recipients, then chunks the sends.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { broadcast_id } = (await req.json().catch(() => ({}))) as { broadcast_id?: string };
    if (!broadcast_id) {
      return new Response(JSON.stringify({ error: "broadcast_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: ok } = await userClient.rpc("is_admin_or_super", { _user_id: userData.user.id });
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: bc, error: bcErr } = await supabase.from("sms_broadcasts").select("*").eq("id", broadcast_id).maybeSingle();
    if (bcErr || !bc) {
      return new Response(JSON.stringify({ error: "Broadcast not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(bc.template_name in TEMPLATES)) {
      return new Response(JSON.stringify({ error: "Unknown template" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (bc.status === "running" || bc.status === "completed") {
      return new Response(JSON.stringify({ error: `Broadcast already ${bc.status}` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Expand audience if no recipients are pre-loaded.
    const { count: existingRecip } = await supabase
      .from("sms_broadcast_recipients").select("id", { count: "exact", head: true })
      .eq("broadcast_id", broadcast_id);

    if ((existingRecip ?? 0) === 0) {
      const f = bc.audience_filter as { role?: string; course_id?: string; centre_id?: string; batch_id?: string };
      let query = supabase.from("profiles").select("user_id, phone_e164, phone, full_name");
      if (f.centre_id) query = query.eq("centre_id", f.centre_id);
      if (f.batch_id) query = query.eq("batch_id", f.batch_id);
      const { data: profs } = await query.limit(10000);

      let userIds = (profs ?? []).map((p) => p.user_id);
      if (f.course_id) {
        const { data: enrolls } = await supabase
          .from("enrollments").select("user_id").eq("course_id", f.course_id).eq("is_active", true);
        const enrolled = new Set((enrolls ?? []).map((e) => e.user_id));
        userIds = userIds.filter((u) => enrolled.has(u));
      }
      if (f.role) {
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", f.role).in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
        const allowed = new Set((roles ?? []).map((r) => r.user_id));
        userIds = userIds.filter((u) => allowed.has(u));
      }
      const allowSet = new Set(userIds);
      const rows = (profs ?? [])
        .filter((p) => allowSet.has(p.user_id))
        .map((p) => {
          const raw = p.phone_e164 || p.phone;
          if (!raw) return null;
          try {
            return { broadcast_id, user_id: p.user_id, phone: toE164(raw), vars: { ...(bc.vars_defaults || {}), name: p.full_name || "Student" } };
          } catch { return null; }
        })
        .filter(Boolean);

      if (rows.length > 0) {
        await supabase.from("sms_broadcast_recipients").insert(rows as any);
      }
      await supabase.from("sms_broadcasts").update({ total_recipients: rows.length, status: "running", started_at: new Date().toISOString() }).eq("id", broadcast_id);
    } else {
      await supabase.from("sms_broadcasts").update({ status: "running", started_at: new Date().toISOString() }).eq("id", broadcast_id);
    }

    // Process pending recipients in chunks.
    const CHUNK = 50;
    let sent = 0, failed = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("sms_broadcast_recipients").select("*").eq("broadcast_id", broadcast_id).eq("status", "pending").limit(CHUNK);
      if (!batch || batch.length === 0) break;

      await Promise.all(batch.map(async (r: any) => {
        try {
          const dest = toDestNumber(r.phone);
          const body = renderTemplate(bc.template_name as TemplateName, r.vars || {});
          const res = await prpsmsSend({ to: dest, body });
          await supabase.from("sms_broadcast_recipients").update({
            status: res.ok ? "sent" : "failed",
            provider_msg_id: res.msg_id ?? null,
            error_code: res.ok ? null : "send_failed",
            error_message: res.ok ? null : (res.error ?? res.raw),
            sent_at: new Date().toISOString(),
          }).eq("id", r.id);
          await supabase.from("sms_send_log").insert({
            to_phone: r.phone, template_name: bc.template_name, vars: r.vars,
            rendered_body: body, purpose: "broadcast",
            provider_msg_id: res.msg_id ?? null,
            status: res.ok ? "sent" : "failed",
            error_message: res.ok ? null : (res.error ?? res.raw),
            sent_by: userData.user!.id, broadcast_id,
          });
          if (res.ok) sent++; else failed++;
        } catch (e) {
          failed++;
          await supabase.from("sms_broadcast_recipients").update({
            status: "failed", error_code: "render_failed", error_message: (e as Error).message, sent_at: new Date().toISOString(),
          }).eq("id", r.id);
        }
      }));

      await supabase.rpc("noop_manage_center_admin_marker"); // tiny wait via roundtrip
    }

    const { count: failedCount } = await supabase.from("sms_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcast_id).eq("status", "failed");
    const { count: sentCount } = await supabase.from("sms_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcast_id).eq("status", "sent");
    await supabase.from("sms_broadcasts").update({
      status: "completed", completed_at: new Date().toISOString(),
      sent_count: sentCount ?? 0, failed_count: failedCount ?? 0,
    }).eq("id", broadcast_id);

    return new Response(JSON.stringify({ ok: true, sent: sentCount ?? 0, failed: failedCount ?? 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
