// Public CBT login: roll number + phone → returns Supabase session for student.
// Verifies the test exists, is CBT-enabled, and the student's batch is allowed.

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
    const token = String(body?.token ?? "").trim();
    const roll = String(body?.roll_number ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    if (!token || !roll || !phone) return json(400, { error: "Missing token / roll number / phone" });

    const admin = createClient(url, service);

    // 1. Validate token → test
    const { data: tests, error: tErr } = await admin.rpc("cbt_test_by_token", { _token: token });
    if (tErr) return json(500, { error: tErr.message });
    const test = Array.isArray(tests) ? tests[0] : tests;
    if (!test) return json(404, { error: "Invalid or expired CBT link" });

    // 2. Lookup student by roll + phone
    const { data: lookup, error: lErr } = await admin.rpc("cbt_lookup_student", { _roll: roll, _phone: phone });
    if (lErr) return json(500, { error: lErr.message });
    const student = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!student) return json(401, { error: "Roll number and mobile number do not match. Contact your centre." });

    // 3. Batch gating (empty list = open to all imported students)
    const allowed: string[] = Array.isArray(test.cbt_allowed_batch_ids) ? test.cbt_allowed_batch_ids : [];
    if (allowed.length > 0) {
      if (!student.batch_id || !allowed.includes(student.batch_id)) {
        return json(403, { error: "Your batch is not allowed for this CBT." });
      }
    }

    // 4. Find synthetic email for this user and sign them in.
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(student.user_id);
    if (uErr || !u?.user?.email) return json(500, { error: "Account not provisioned" });
    const email = u.user.email;

    // Use anon client to actually create a session
    const userClient = createClient(url, anon);
    const { data: sess, error: sErr } = await userClient.auth.signInWithPassword({
      email,
      password: phone,
    });
    if (sErr || !sess.session) return json(401, { error: "Account password mismatch. Contact admin." });

    return json(200, {
      success: true,
      test: {
        id: test.id,
        title: test.title,
        slug_url: `/tests/${test.id}/take`,
        duration_minutes: test.duration_minutes,
      },
      session: {
        access_token: sess.session.access_token,
        refresh_token: sess.session.refresh_token,
      },
      student: {
        roll_number: roll,
        full_name: student.full_name,
      },
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
