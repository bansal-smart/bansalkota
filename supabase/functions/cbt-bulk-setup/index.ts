// One-shot CBT setup:
// - Ensures Kota center, courses, and the 7 batches exist.
// - Creates one auth user per roster row (email = roll@cbt.bansal.local, password = phone),
//   sets profile (roll_number, batch, center, etc.), grants student role, enrolls in matching course.
// Idempotent: existing students (matched by roll_number / email) are updated, not duplicated.

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

type Row = {
  roll_number: string;
  full_name: string;
  phone: string;
  dob: string | null;
  course: string;        // "BULLS EYE" | "STERLING" | "NUCLEUS" ...
  stream: string;        // "JEE" | "NEET" ...
  batch_code: string;    // "XI-J1"
  class_level: string;   // "XI" | "XII" | "XIII"
};

const COURSE_MAP: Record<string, { name: string; slug: string; subject: string; educator: string }> = {
  "BULLS EYE": { name: "Bulls Eye JEE", slug: "bulls-eye-jee", subject: "JEE", educator: "Bansal Faculty" },
  "STERLING":  { name: "Sterling JEE",  slug: "sterling-jee",  subject: "JEE", educator: "Bansal Faculty" },
  "NUCLEUS":   { name: "Nucleus JEE",   slug: "nucleus-jee",   subject: "JEE", educator: "Bansal Faculty" },
};

// Normalise any variant of a course name to its canonical map key
// e.g. "Bulls Eye", "bulls-eye", "BULLS  EYE" → "BULLS EYE"
const normaliseCourseKey = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!ud?.user) return json(401, { error: "Unauthorized" });

    const admin = createClient(url, service);
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      admin.rpc("has_role", { _user_id: ud.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: ud.user.id, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) return json(403, { error: "Only admins can run CBT setup" });

    const body = await req.json().catch(() => ({}));
    const rows: Row[] = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) return json(400, { error: "rows are required" });

    // 1. Kota center
    const { data: centerRow } = await admin.from("centers").select("id").eq("slug", "kota").maybeSingle();
    let centerId = (centerRow as { id?: string } | null)?.id;
    if (!centerId) {
      const { data: created, error: cErr } = await admin
        .from("centers")
        .insert({ slug: "kota", city: "Kota", state: "Rajasthan", region: "North", is_published: true, verified: true })
        .select("id").single();
      if (cErr) return json(500, { error: "Center create failed: " + cErr.message });
      centerId = created.id;
    }

    // 2. Ensure courses
    const courseIdByKey: Record<string, string> = {};
    const distinctCourses = Array.from(new Set(rows.map((r) => r.course.toUpperCase())));
    for (const key of distinctCourses) {
      const meta = COURSE_MAP[key] ?? { name: key, slug: key.toLowerCase().replace(/\s+/g, "-"), subject: "JEE", educator: "Bansal Faculty" };
      const { data: existing } = await admin.from("courses").select("id").eq("slug", meta.slug).maybeSingle();
      if (existing) {
        courseIdByKey[key] = (existing as { id: string }).id;
      } else {
        const { data: created, error: cErr } = await admin
          .from("courses")
          .insert({
            slug: meta.slug,
            name: meta.name,
            subject: meta.subject,
            educator_name: meta.educator,
            target_exam: "JEE",
            level: "Offline Classroom",
            price: 0,
            is_published: false,
          })
          .select("id").single();
        if (cErr) return json(500, { error: `Course create failed (${meta.name}): ${cErr.message}` });
        courseIdByKey[key] = created.id;
      }
    }

    // 3. Ensure batches per (course, batch_code)
    const batchKey = (course: string, code: string) => `${course}::${code}`;
    const batchIdByKey: Record<string, string> = {};
    const distinctBatches = Array.from(
      new Map(rows.map((r) => [batchKey(r.course.toUpperCase(), r.batch_code), {
        courseKey: r.course.toUpperCase(),
        code: r.batch_code,
        class_level: r.class_level,
      }])).values()
    );
    for (const b of distinctBatches) {
      const courseId = courseIdByKey[b.courseKey];
      const { data: existing } = await admin
        .from("course_batches")
        .select("id")
        .eq("course_id", courseId)
        .eq("code", b.code)
        .maybeSingle();
      if (existing) {
        batchIdByKey[batchKey(b.courseKey, b.code)] = (existing as { id: string }).id;
      } else {
        const { data: created, error: bErr } = await admin
          .from("course_batches")
          .insert({
            course_id: courseId,
            center_id: centerId,
            code: b.code,
            name: b.code,
            class_level: b.class_level,
            is_active: true,
          })
          .select("id").single();
        if (bErr) return json(500, { error: `Batch create failed (${b.code}): ${bErr.message}` });
        batchIdByKey[batchKey(b.courseKey, b.code)] = created.id;
      }
    }

    // 4. Cache existing auth users by email
    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailToId = new Map<string, string>();
    (usersList?.users ?? []).forEach((u) => { if (u.email) emailToId.set(u.email.toLowerCase(), u.id); });

    const results: Array<Record<string, unknown>> = [];

    for (const r of rows) {
      try {
        const email = `${r.roll_number}@cbt.bansal.local`.toLowerCase();
        const courseId = courseIdByKey[r.course.toUpperCase()];
        const batchId = batchIdByKey[batchKey(r.course.toUpperCase(), r.batch_code)];

        let userId = emailToId.get(email);
        let createdNew = false;

        if (!userId) {
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email,
            password: r.phone,
            email_confirm: true,
            user_metadata: { full_name: r.full_name },
          });
          if (cErr || !created.user) throw cErr ?? new Error("createUser failed");
          userId = created.user.id;
          emailToId.set(email, userId);
          createdNew = true;
        } else {
          // Make sure password matches current phone (in case phone changed)
          await admin.auth.admin.updateUserById(userId, { password: r.phone });
        }

        // Role
        await admin.from("user_roles").upsert(
          { user_id: userId, role: "student" },
          { onConflict: "user_id,role" },
        );

        // Profile
        await admin.from("profiles").upsert({
          user_id: userId,
          full_name: r.full_name,
          phone: r.phone,
          roll_number: r.roll_number,
          batch_id: batchId,
          center_id: centerId,
          target_exam: r.stream,
          class_level: r.class_level,
          city: "Kota",
          state: "Rajasthan",
          country: "India",
          is_bansal_offline_student: true,
        }, { onConflict: "user_id" });

        // Enrollment
        await admin.from("enrollments").upsert(
          { user_id: userId, course_id: courseId, is_active: true },
          { onConflict: "user_id,course_id" },
        );

        results.push({ roll_number: r.roll_number, status: createdNew ? "created" : "updated" });
      } catch (e) {
        results.push({ roll_number: r.roll_number, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      errors: results.filter((r) => r.status === "error").length,
      courses: Object.keys(courseIdByKey).length,
      batches: Object.keys(batchIdByKey).length,
    };

    return json(200, { success: true, summary, results });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
