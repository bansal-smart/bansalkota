// Edge function: admin-create-center-user
// Creates an auth user (email + password), or resets an existing user's password,
// and attaches them to a centre via centre_staff (which auto-grants center_admin role).
// Optionally assigns a centre-scope custom role via role_assignments.
// Callable by admin/super_admin for any centre, or by that centre's own admin.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Validate caller. getClaims() is preferred (fast local verification) but
  // isn't reliable in every project setup — same issue hit in prpsms-balance
  // — so fall back to getUser() (a network round-trip to Auth) rather than
  // hard-failing the whole request when it throws or comes back empty.
  const token = authHeader.replace("Bearer ", "");
  let callerId: string | null = null;
  try {
    const { data: claimsData } = await userClient.auth.getClaims(token);
    if (claimsData?.claims?.sub) callerId = claimsData.claims.sub as string;
  } catch (_) { /* fall through */ }
  if (!callerId) {
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json(401, { error: "Unauthorized" });
    callerId = userData.user.id;
  }

  const { data: isAdmin } = await admin.rpc("is_admin_or_super", { _user_id: callerId });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const action = body.action as "create" | "reset_password";
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const password = (body.password ?? "").toString();
  const centerId = (body.centre_id ?? "").toString();
  const fullName = (body.full_name ?? "").toString().trim();
  // centre_staff.role only allows 'owner' | 'manager' (DB CHECK constraint) —
  // guard against any caller passing a human-readable role label instead.
  const rawRole = (body.role ?? "manager").toString();
  const role = rawRole === "owner" ? "owner" : "manager";
  const customRoleId: string | null = body.custom_role_id ?? null;

  // Non-admins must be the centre admin (no custom role assigned) for the target centre.
  if (!isAdmin) {
    if (!centerId) return json(403, { error: "Only admins can perform this action" });
    const { data: isCentreAdmin } = await admin.rpc("is_centre_admin_of", {
      _user_id: callerId,
      _centre_id: centerId,
    });
    if (!isCentreAdmin) return json(403, { error: "Only the Centre Admin can perform this action" });
  }

  if (!email || !password) return json(400, { error: "email and password are required" });
  if (password.length < 8) return json(400, { error: "Password must be at least 8 characters" });
  if (action === "create" && !centerId) return json(400, { error: "centre_id is required when creating" });

  // Look up existing user. lookup_user_id_by_email() itself checks
  // is_admin_or_super(auth.uid()) — but auth.uid() is NULL for the
  // service-role `admin` client (no user JWT attached), so that RPC always
  // raises "Not authorized" here, silently swallowed since only `data` was
  // read. Use listUsers() + filter instead (same pattern as manage-admin),
  // since this function has already authorized the caller itself above.
  let userId: string | null = null;
  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = existingUsers?.users.find((u) => u.email?.toLowerCase() === email);
  if (existingUser) userId = existingUser.id;

  if (action === "create") {
    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr || !created.user) return json(400, { error: createErr?.message ?? "Could not create user" });
      userId = created.user.id;
    } else {
      // user exists — just reset password
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (updErr) return json(400, { error: updErr.message });
    }

    // Attach to centre (idempotent)
    const { error: linkErr } = await admin
      .from("centre_staff")
      .upsert(
        { user_id: userId, centre_id: centerId, role },
        { onConflict: "user_id,centre_id" },
      );
    if (linkErr) return json(400, { error: linkErr.message });

    // Optional custom centre role assignment
    await admin.from("role_assignments").delete().eq("user_id", userId);
    if (customRoleId) {
      const { error: roleErr } = await admin
        .from("role_assignments")
        .insert({ user_id: userId, role_id: customRoleId });
      if (roleErr) return json(400, { error: roleErr.message });
    }

    return json(200, { ok: true, user_id: userId, email });
  }

  if (action === "reset_password") {
    if (!userId) return json(404, { error: "No user with that email" });
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updErr) return json(400, { error: updErr.message });
    return json(200, { ok: true, user_id: userId, email });
  }

  return json(400, { error: "Unknown action" });
});
