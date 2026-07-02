import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderTemplate, prpsmsSend, toDestNumber, toE164, sha256Hex } from "../_shared/prpsms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PURPOSES = ["signup", "login", "password_reset", "sensitive_action"] as const;
type Purpose = typeof PURPOSES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, purpose } = body as { phone?: string; purpose?: Purpose };
    if (!phone || typeof phone !== "string" || !PURPOSES.includes(purpose as Purpose)) {
      return new Response(JSON.stringify({ error: "Invalid input. Required: phone, purpose" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let e164: string, dest: string;
    try {
      e164 = toE164(phone);
      dest = toDestNumber(phone);
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 5 OTPs per phone per hour.
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count: recentCount } = await supabase
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", e164)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate 6-digit OTP and render the DLT-approved template.
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const rendered = renderTemplate("CodeRed", { otp });

    const sendResult = await prpsmsSend({ to: dest, body: rendered });

    if (!sendResult.ok) {
      await supabase.from("sms_send_log").insert({
        to_phone: e164,
        template_name: "CodeRed",
        vars: { otp: "******" },
        rendered_body: rendered,
        purpose: `otp:${purpose}`,
        provider_msg_id: null,
        status: "failed",
        error_code: null,
        error_message: sendResult.error ?? sendResult.raw ?? "unknown",
      });
      return new Response(JSON.stringify({ error: "Failed to send OTP. Please try again." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const otpHash = await sha256Hex(`${e164}:${purpose}:${otp}`);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const ip = req.headers.get("x-forwarded-for") || null;

    await supabase.from("phone_otps").insert({
      phone: e164, otp_hash: otpHash, purpose, expires_at: expiresAt, ip,
    });

    await supabase.from("sms_send_log").insert({
      to_phone: e164,
      template_name: "CodeRed",
      vars: { otp: "******" },
      rendered_body: rendered,
      purpose: `otp:${purpose}`,
      provider_msg_id: sendResult.msg_id ?? null,
      status: "sent",
      error_code: null,
      error_message: null,
    });

    return new Response(JSON.stringify({ ok: true, expires_at: expiresAt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
