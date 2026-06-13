// Public CBT login (kiosk): roll number + phone -> returns Supabase session for student.
// No per-test token. The kiosk page lists live tests for the student's batch after login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const roll = String(body?.roll_number ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    if (!roll || !phone) return json(400, { error: "Missing roll number / phone" });

    const admin = createClient(url, service);

    const { data: lookup, error: lErr } = await admin.rpc("cbt_lookup_student", { _roll: roll, _phone: phone });
    if (lErr) return json(500, { error: lErr.message });
    const student = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!student) return json(401, { error: "Roll number and mobile number do not match. Contact your centre." });

    const { data: u, error: uErr } = await admin.auth.admin.getUserById(student.user_id);
    if (uErr || !u?.user?.email) return json(500, { error: "Account not provisioned" });
    const email = u.user.email;

    const userClient = createClient(url, anon);
    const { data: sess, error: sErr } = await userClient.auth.signInWithPassword({ email, password: phone });
    if (sErr || !sess.session) return json(401, { error: "Account password mismatch. Contact admin." });

    return json(200, {
      success: true,
      session: {
        access_token: sess.session.access_token,
        refresh_token: sess.session.refresh_token,
      },
      student: {
        user_id: student.user_id,
        full_name: student.full_name,
        batch_id: student.batch_id,
        roll_number: roll,
      },
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
