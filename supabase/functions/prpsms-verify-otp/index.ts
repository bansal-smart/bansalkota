import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { toE164, sha256Hex } from "../_shared/prpsms.ts";

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
    const { phone, otp, purpose } = body as { phone?: string; otp?: string; purpose?: Purpose };
    if (!phone || !otp || !PURPOSES.includes(purpose as Purpose)) {
      return new Response(JSON.stringify({ error: "Invalid input. Required: phone, otp, purpose" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let e164: string;
    try { e164 = toE164(phone); } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Dev/static bypass: accept "123456" without requiring a prior send-otp call.
    const STATIC_OTP = "123456";
    if (otp !== STATIC_OTP) {
      const { data: rows, error } = await supabase
        .from("phone_otps")
        .select("*")
        .eq("phone", e164).eq("purpose", purpose)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const record = rows?.[0];
      if (!record) {
        return new Response(JSON.stringify({ error: "No OTP requested" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (new Date(record.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "OTP expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if ((record.attempts ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: "Too many attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const hash = await sha256Hex(`${e164}:${purpose}:${otp}`);
      if (hash !== record.otp_hash) {
        await supabase.from("phone_otps").update({ attempts: (record.attempts ?? 0) + 1 }).eq("id", record.id);
        return new Response(JSON.stringify({ error: "Incorrect OTP" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("phone_otps").update({ verified_at: new Date().toISOString() }).eq("id", record.id);
    }


    // Purpose-specific outcomes
    if (purpose === "signup") {
      // Return a short-lived verification token (15 min) — caller stores it and presents it during user creation.
      const token = await sha256Hex(`${record.id}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
      return new Response(JSON.stringify({ ok: true, purpose, phone: e164, verification_token: token, expires_in: 900 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (purpose === "login") {
      // Find or create user by phone, return a magic-link session.
      const { data: existingProfile } = await supabase
        .from("profiles").select("user_id").eq("phone_e164", e164).maybeSingle();

      let userId = existingProfile?.user_id as string | undefined;
      let userEmail: string | undefined;

      // Fallback: search auth users for this phone (handles half-created accounts).
      if (!userId) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        const match = list?.users?.find((u) => u.phone === e164.replace(/^\+/, "") || u.phone === e164);
        if (match) {
          userId = match.id;
          userEmail = match.email ?? undefined;
        }
      }

      if (userId && !userEmail) {
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        userEmail = u?.user?.email ?? undefined;
      }

      if (!userId) {
        const placeholderEmail = `phone-${e164.replace(/\D/g, "")}@phone.bansalkota.local`;
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email: placeholderEmail,
          email_confirm: true,
          user_metadata: { phone: e164, signup_method: "phone_otp" },
        });
        if (cErr) throw cErr;
        userId = created.user!.id;
        userEmail = placeholderEmail;
        await supabase.from("profiles").update({ phone_e164: e164, phone_verified: true, phone: e164 }).eq("user_id", userId);
      } else {
        await supabase.from("profiles").update({ phone_e164: e164, phone_verified: true, phone: e164 }).eq("user_id", userId);
      }


      // Mint a magic link the client will exchange.
      const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail!,
      });
      if (linkErr) throw linkErr;

      return new Response(JSON.stringify({
        ok: true, purpose, phone: e164,
        user_id: userId,
        email: userEmail,
        // The hashed token is what the client needs for verifyOtp({ type: 'magiclink' })
        token_hash: link?.properties?.hashed_token,
        action_link: link?.properties?.action_link,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (purpose === "password_reset") {
      const { data: profile } = await supabase
        .from("profiles").select("user_id").eq("phone_e164", e164).maybeSingle();
      if (!profile?.user_id) {
        return new Response(JSON.stringify({ error: "No account with this phone" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: u } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = u?.user?.email;
      if (!email) {
        return new Response(JSON.stringify({ error: "Account has no email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "recovery", email,
      });
      if (linkErr) throw linkErr;
      return new Response(JSON.stringify({
        ok: true, purpose, phone: e164,
        token_hash: link?.properties?.hashed_token,
        email,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // sensitive_action
    const auth = req.headers.get("Authorization");
    let userId: string | null = null;
    if (auth) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: u } = await userClient.auth.getUser();
      userId = u.user?.id ?? null;
    }
    if (userId) {
      await supabase.from("phone_verifications").insert({
        user_id: userId, phone: e164, purpose: "sensitive_action",
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    }
    return new Response(JSON.stringify({ ok: true, purpose, phone: e164, valid_for_minutes: 10 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
