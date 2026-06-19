import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) return json(403, { error: "Only admins can manage centre logins" });

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "create") {
      const centre_id = String(body?.centre_id ?? "").trim();
      const email = String(body?.email ?? "").toLowerCase().trim();
      const password = String(body?.password ?? "");
      const full_name = String(body?.full_name ?? "").trim();
      const phone = body?.phone ? String(body.phone).trim() : null;
      const staff_role = body?.staff_role === "owner" ? "owner" : "manager";

      if (!centre_id || !email || !full_name || password.length < 8) {
        return json(400, { error: "centre_id, email, full_name and password (min 8 chars) are required" });
      }

      const { data: center } = await admin.from("centres").select("id, city, area").eq("id", centre_id).maybeSingle();
      if (!center) return json(404, { error: "Centre not found" });

      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      let target = userList?.users.find((u) => u.email?.toLowerCase() === email) ?? null;

      if (!target) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name,
            phone,
          },
          app_metadata: {
            must_change_password: true,
          },
        });
        if (createErr) throw createErr;
        target = created.user!;
      } else {
        const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
          password,
          email_confirm: true,
          user_metadata: {
            ...(target.user_metadata ?? {}),
            full_name,
            phone,
          },
          app_metadata: {
            ...(target.app_metadata ?? {}),
            must_change_password: true,
          },
        });
        if (updErr) throw updErr;
      }

      const { error: profErr } = await admin.from("profiles").upsert({
        user_id: target.id,
        full_name,
        phone,
        centre_id,
      }, { onConflict: "user_id" });
      if (profErr) throw profErr;

      const { error: staffErr } = await admin.from("centre_staff").upsert({
        centre_id,
        user_id: target.id,
        role: staff_role,
      }, { onConflict: "centre_id,user_id" });
      if (staffErr) throw staffErr;

      return json(200, {
        success: true,
        user_id: target.id,
        email,
        password,
        center_label: `${center.city}${center.area && center.area !== center.city ? ` — ${center.area}` : ""}`,
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});
