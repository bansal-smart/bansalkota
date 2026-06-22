import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderTemplate, prpsmsSend, toDestNumber, toE164, TEMPLATES, TemplateName } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Caller must be authenticated as admin/super_admin OR pass the service role key.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { to_phone, template_name, vars = {}, purpose = "transactional", schtm } = body as {
      to_phone?: string; template_name?: string; vars?: Record<string, string>; purpose?: string; schtm?: string;
    };
    if (!to_phone || !template_name || !(template_name in TEMPLATES)) {
      return new Response(JSON.stringify({ error: "Invalid input. Required: to_phone, template_name (approved)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth: allow service role OR admin/super_admin user.
    const auth = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isService = auth === `Bearer ${serviceKey}`;
    let senderId: string | null = null;

    if (!isService) {
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      senderId = userData.user.id;
      const { data: isAdmin } = await userClient.rpc("is_admin_or_super", { _user_id: senderId });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let dest: string, e164: string, rendered: string;
    try {
      dest = toDestNumber(to_phone);
      e164 = toE164(to_phone);
      rendered = renderTemplate(template_name as TemplateName, vars);
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const sendRes = await prpsmsSend({ to: dest, body: rendered, schtm });

    await supabase.from("sms_send_log").insert({
      to_phone: e164,
      template_name,
      vars,
      rendered_body: rendered,
      purpose,
      provider_msg_id: sendRes.msg_id ?? null,
      status: sendRes.ok ? "sent" : "failed",
      error_code: sendRes.ok ? null : "send_failed",
      error_message: sendRes.ok ? null : (sendRes.error ?? sendRes.raw),
      sent_by: senderId,
    });

    if (!sendRes.ok) {
      return new Response(JSON.stringify({ error: "Send failed", detail: sendRes.error ?? sendRes.raw }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, msg_id: sendRes.msg_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
