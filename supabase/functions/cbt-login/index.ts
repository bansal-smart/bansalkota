// Public CBT login (kiosk): roll number + password -> returns Supabase session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type StudentRow = { user_id: string; full_name: string; batch_id: string | null };

async function verifyRollPassword(
  admin: ReturnType<typeof createClient>,
  roll: string,
  password: string,
): Promise<StudentRow | null> {
  const { data: match, error: mErr } = await admin.rpc("cbt_verify_password", {
    _roll: roll,
    _password: password,
  });
  if (mErr) throw mErr;
  const student = Array.isArray(match) ? match[0] : match;
  return student ?? null;
}

async function rollExists(admin: ReturnType<typeof createClient>, roll: string): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("roll_number", roll)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data?.user_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    let roll = String(body?.roll_number ?? "").trim();
    const password = String(body?.password ?? "");
    if (!roll || !password) return json(400, { error: "Missing roll number / password" });

    const admin = createClient(url, service);

    // Students sometimes paste roll+password into the roll field
    // (e.g. 26115395602759 with password 95602759). Recover the real roll.
    let student = await verifyRollPassword(admin, roll, password);
    if (
      !student &&
      /^\d{7,}$/.test(roll) &&
      password.length >= 4 &&
      roll.endsWith(password)
    ) {
      const candidate = roll.slice(0, -password.length);
      if (candidate.length >= 2) {
        student = await verifyRollPassword(admin, candidate, password);
        if (student) roll = candidate;
      }
    }

    if (!student) {
      const exists = await rollExists(admin, roll);
      if (!exists && /^\d{7,}$/.test(roll) && password.length >= 4 && roll.endsWith(password)) {
        const candidate = roll.slice(0, -password.length);
        if (candidate.length >= 2 && !(await rollExists(admin, candidate))) {
          return json(401, {
            error: "Invalid roll number. Use your registration / roll number from your centre.",
          });
        }
      }
      if (!(await rollExists(admin, roll))) {
        return json(401, {
          error: "Invalid roll number. Use your registration / roll number from your centre.",
        });
      }
      return json(401, {
        error: "Incorrect password. Contact your centre if you forgot it.",
      });
    }

    // Block login if the student's centre is suspended.
    const { data: suspended } = await admin.rpc("is_centre_suspended_for_user", { _user_id: student.user_id });
    if (suspended) return json(403, { error: "This centre is currently suspended. Contact Bansal HQ." });

    const { data: u, error: uErr } = await admin.auth.admin.getUserById(student.user_id);
    if (uErr || !u?.user?.email) return json(500, { error: "Account not provisioned" });

    const userClient = createClient(url, anon);
    const { data: sess, error: sErr } = await userClient.auth.signInWithPassword({
      email: u.user.email,
      password,
    });
    if (sErr || !sess.session) {
      return json(401, { error: "Incorrect password. Contact your centre if you forgot it." });
    }

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
