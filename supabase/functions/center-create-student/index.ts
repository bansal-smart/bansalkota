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
    const caller = userData.user.id;

    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      admin.rpc("has_role", { _user_id: caller, _role: "admin" }),
      admin.rpc("has_role", { _user_id: caller, _role: "super_admin" }),
    ]);

    const body = await req.json();
    const centre_id = String(body?.centre_id ?? "").trim();
    if (!centre_id) return json(400, { error: "centre_id required" });

    // Authorise: caller must be admin/super, or staff of this centre
    let authorised = !!(isAdmin || isSuper);
    if (!authorised) {
      const { data: staff } = await admin
        .from("centre_staff")
        .select("centre_id")
        .eq("user_id", caller)
        .eq("centre_id", centre_id)
        .maybeSingle();
      authorised = !!staff;
    }
    if (!authorised) return json(403, { error: "Not authorised for this centre" });

    const full_name = String(body?.full_name ?? "").trim();
    const phone = body?.phone ? String(body.phone).trim() : null;
    const roll_number = body?.roll_number ? String(body.roll_number).trim() : null;
    const class_level = body?.class_level ? String(body.class_level).trim() : null;
    const target_exam = body?.target_exam ? String(body.target_exam).trim() : null;
    const city = body?.city ? String(body.city).trim() : null;
    const batch_id = body?.batch_id ? String(body.batch_id).trim() : null;
    const student_status = ["active", "inactive", "passed_out", "dropped"].includes(body?.student_status)
      ? body.student_status
      : "active";

    if (!full_name) return json(400, { error: "full_name required" });
    if (!phone && !roll_number) return json(400, { error: "phone or roll_number required" });

    let email = body?.email ? String(body.email).toLowerCase().trim() : "";
    let password = body?.password ? String(body.password) : "";
    if (!email) {
      const seed = (roll_number || phone || crypto.randomUUID().slice(0, 8))
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      email = `student-${seed}-${Date.now().toString(36)}@bansal.local`;
    }
    if (!password || password.length < 8) {
      password = `Bansal@${Math.random().toString(36).slice(2, 10)}`;
    }

    // Find or create auth user
    const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    let target = userList?.users.find((u) => u.email?.toLowerCase() === email) ?? null;

    if (!target) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (createErr) throw createErr;
      target = created.user!;
    }

    // Block if target is admin/teacher
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", target.id);
    const roleSet = new Set((existingRoles ?? []).map((r: any) => r.role));
    if (roleSet.has("admin") || roleSet.has("super_admin") || roleSet.has("teacher")) {
      return json(400, { error: "This email belongs to a staff/admin account" });
    }

    // Ensure student role
    if (!roleSet.has("student")) {
      await admin.from("user_roles").insert({ user_id: target.id, role: "student" });
    }

    // Check roll_number conflict
    if (roll_number) {
      const { data: existingRoll } = await admin
        .from("profiles")
        .select("user_id")
        .eq("roll_number", roll_number)
        .maybeSingle();
      if (existingRoll && (existingRoll as any).user_id !== target.id) {
        return json(400, { error: `Roll number ${roll_number} is already used by another student` });
      }
    }

    const profilePatch: Record<string, any> = {
      user_id: target.id,
      full_name,
      phone,
      centre_id,
      batch_id,
      roll_number,
      class_level,
      target_exam,
      city,
      student_status,
      is_bansal_offline_student: true,
    };

    const { error: pErr } = await admin
      .from("profiles")
      .upsert(profilePatch, { onConflict: "user_id" });
    if (pErr) throw pErr;

    return json(200, {
      success: true,
      user_id: target.id,
      email,
      password,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});
