import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * DEV-ONLY mock mobile OTP edge function.
 *
 * Given a phone number and a 6-digit OTP, it ensures a Supabase auth user
 * exists for `mobile<+91XXXXXXXXXX>@bansal.local` with a deterministic
 * server-side password, then returns { email, password } so the client can
 * complete `signInWithPassword`.
 *
 * In dev ANY 6-digit code is accepted. Replace with a real SMS provider
 * (Twilio/MSG91) before production.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mobile, otp } = await req.json();

    if (typeof mobile !== "string" || !/^\+91\d{10}$/.test(mobile)) {
      return new Response(JSON.stringify({ error: "Invalid mobile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const digits = mobile.replace("+", "");
    const email = `mobile${digits}@bansal.local`;
    // Deterministic per-mobile password. Never leaves the server logs.
    const passwordSeed = Deno.env.get("MOBILE_OTP_SECRET") || serviceKey;
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${digits}::${passwordSeed}`),
    );
    const password = "Bx!" + Array.from(new Uint8Array(hashBuf))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Look up existing user by email.
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.data?.users.find((u) => u.email?.toLowerCase() === email);

    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: mobile,
        user_metadata: { mobile, login_method: "mobile_otp_mock" },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Ensure password matches current seed (in case secret was rotated).
      await admin.auth.admin.updateUserById(existing.id, { password });
    }

    return new Response(JSON.stringify({ email, password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
