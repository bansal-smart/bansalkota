// Edge function: admin-create-center-user
// Creates an auth user (email + password), or resets an existing user's password,
// and attaches them to a centre via centre_staff (which auto-grants center_admin role).
// Only callable by admin or super_admin.

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

  // Validate caller
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });
  const callerId = claimsData.claims.sub as string;

  const { data: isAdmin } = await admin.rpc("is_admin_or_super", { _user_id: callerId });
  if (!isAdmin) return json(403, { error: "Only admins can perform this action" });

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
  const role = (body.role ?? "manager").toString();

  if (!email || !password) return json(400, { error: "email and password are required" });
  if (password.length < 8) return json(400, { error: "Password must be at least 8 characters" });
  if (action === "create" && !centerId) return json(400, { error: "centre_id is required when creating" });

  // Look up existing user
  let userId: string | null = null;
  const { data: existing } = await admin.rpc("lookup_user_id_by_email", { _email: email });
  if (existing) userId = existing as string;

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
