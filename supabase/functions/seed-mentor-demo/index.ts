import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Seeds:
 *   - 1 mentor user (mentor1@arke.pro / mentor1@987) with role 'mentor'
 *   - 3 student users (mentee1..3@arke.pro / Mentee@123) with role 'student'
 *   - Assigns all 3 students to the mentor (auto-creates the mentor group via trigger)
 *
 * Idempotent: re-running updates passwords and re-uses existing users / assignments.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const ensureUser = async (
      email: string,
      password: string,
      fullName: string,
      role: "mentor" | "student",
      meta: Record<string, unknown> = {},
    ) => {
      // Find existing
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, ...meta },
        });
        if (error) throw error;
        user = created.user!;
      } else {
        await admin.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, ...meta },
        });
      }

      // Ensure profile
      await admin.from("profiles").upsert(
        { user_id: user.id, full_name: fullName, ...meta },
        { onConflict: "user_id" },
      );

      // Ensure role
      await admin
        .from("user_roles")
        .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

      return user.id;
    };

    const mentorId = await ensureUser(
      "mentor1@arke.pro",
      "mentor1@987",
      "Mentor One",
      "mentor",
    );

    const students = [
      { email: "mentee1@arke.pro", name: "Aarav Kapoor", target_exam: "JEE", class_level: "12" },
      { email: "mentee2@arke.pro", name: "Diya Sharma", target_exam: "NEET", class_level: "12" },
      { email: "mentee3@arke.pro", name: "Rohan Mehta", target_exam: "JEE", class_level: "11" },
    ];

    const studentIds: string[] = [];
    for (const s of students) {
      const id = await ensureUser(s.email, "Mentee@123", s.name, "student", {
        target_exam: s.target_exam,
        class_level: s.class_level,
      });
      studentIds.push(id);
    }

    // Assign students to mentor (idempotent — restore if soft-removed)
    for (const sid of studentIds) {
      const { data: existing } = await admin
        .from("mentor_student_assignments")
        .select("id, removed_at")
        .eq("mentor_id", mentorId)
        .eq("student_id", sid)
        .maybeSingle();

      if (!existing) {
        await admin.from("mentor_student_assignments").insert({
          mentor_id: mentorId,
          student_id: sid,
          assigned_by: mentorId,
        });
      } else if (existing.removed_at) {
        await admin
          .from("mentor_student_assignments")
          .update({ removed_at: null })
          .eq("id", existing.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mentor: { id: mentorId, email: "mentor1@arke.pro", password: "mentor1@987" },
        students: students.map((s, i) => ({
          id: studentIds[i],
          email: s.email,
          password: "Mentee@123",
          name: s.name,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
