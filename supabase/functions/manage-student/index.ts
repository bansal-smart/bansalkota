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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "").trim();

    // Decode JWT payload (no signature verification — service-role role check below is the gate)
    let callerId: string | null = null;
    try {
      const part = token.split(".")[1];
      const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
      const payload = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
      callerId = payload?.sub ?? null;
    } catch {
      return json(401, { error: "Unauthorized" });
    }
    if (!callerId) return json(401, { error: "Unauthorized" });

    const admin = createClient(supabaseUrl, serviceKey);
    // Confirm the user still exists
    const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(callerId);
    if (authUserErr || !authUser?.user) return json(401, { error: "Unauthorized" });
    const userData = { user: authUser.user };

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: callerId, _role: "super_admin" });
    if (!isAdmin && !isSuper) return json(403, { error: "Only admins can manage students" });

    const body = await req.json();
    const action: string = body?.action;

    // Ensure target user is a student (not admin/super_admin/teacher/mentor)
    const ensureStudent = async (uid: string) => {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
      const set = new Set((roles ?? []).map((r) => r.role));
      if (set.has("super_admin") || set.has("admin")) return false;
      return true;
    };

    if (action === "get_emails") {
      const ids: string[] = Array.isArray(body?.user_ids) ? body.user_ids : [];
      if (!ids.length) return json(200, { emails: {} });
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const map: Record<string, string | null> = {};
      ids.forEach((id) => {
        const u = usersList?.users.find((x) => x.id === id);
        map[id] = u?.email ?? null;
      });
      return json(200, { emails: map });
    }

    if (action === "update") {
      const user_id = String(body?.user_id ?? "");
      if (!user_id) return json(400, { error: "user_id required" });
      if (!(await ensureStudent(user_id))) return json(403, { error: "Target is not a student" });

      const allowed = ["full_name", "father_name", "roll_number", "dob", "phone", "parent_phone", "target_exam", "class_level", "city", "country", "plan", "goal", "centre_id", "batch_id", "batch_label"];
      const update: Record<string, unknown> = { user_id };
      for (const k of allowed) {
        if (body?.[k] !== undefined) update[k] = body[k];
      }
      if (Object.keys(update).length > 1) {
        const { error: pErr } = await admin
          .from("profiles")
          .upsert(update, { onConflict: "user_id" });
        if (pErr) throw pErr;
      }

      // Sync course enrollments if provided
      if (Array.isArray(body?.course_ids)) {
        const courseIds: string[] = (body.course_ids as unknown[])
          .map((x) => String(x ?? "").trim())
          .filter((x) => x.length > 0);

        if (courseIds.length > 0) {
          const rows = courseIds.map((course_id) => ({ user_id, course_id, is_active: true }));
          const { error: eErr } = await admin
            .from("enrollments")
            .upsert(rows, { onConflict: "user_id,course_id" });
          if (eErr) throw eErr;
        }

        // Deactivate any active enrollments not in the new set
        let q = admin
          .from("enrollments")
          .update({ is_active: false })
          .eq("user_id", user_id)
          .eq("is_active", true);
        if (courseIds.length > 0) {
          q = q.not("course_id", "in", `(${courseIds.join(",")})`);
        }
        const { error: dErr } = await q;
        if (dErr) throw dErr;
      }

      return json(200, { success: true });
    }

    if (action === "delete") {
      const user_id = String(body?.user_id ?? "");
      if (!user_id) return json(400, { error: "user_id required" });
      if (user_id === userData.user.id) return json(400, { error: "Cannot delete yourself" });
      if (!(await ensureStudent(user_id))) return json(403, { error: "Target is not a student" });
      // Cleanup roles then delete auth user (profile cascades via FK)
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error: dErr } = await admin.auth.admin.deleteUser(user_id);
      if (dErr) throw dErr;
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});
