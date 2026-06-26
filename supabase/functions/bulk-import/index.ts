// Generic bulk-import edge function.
// Kinds: 'centres' | 'students' | 'centre_courses' | 'enrollments'
// Supports dry_run (validates without writing). Returns per-row results.

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

type RowResult = { row: number; ok: boolean; error?: string; id?: string };

const slugify = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const trimOrNull = (v: any) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};
const toNum = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      console.error("bulk-import: missing Authorization header");
      return json(401, { error: "Unauthorized: missing bearer token" });
    }
    const token = authHeader.slice(7).trim();

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("bulk-import: getUser failed", userErr?.message);
      return json(401, { error: `Unauthorized: ${userErr?.message ?? "no user"}` });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const uid = userData.user.id;

    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      admin.rpc("has_role", { _user_id: uid, _role: "admin" }),
      admin.rpc("has_role", { _user_id: uid, _role: "super_admin" }),
    ]);
    const isAnyAdmin = !!isAdmin || !!isSuper;

    // Resolve centre staff memberships
    const { data: staff } = await admin
      .from("centre_staff")
      .select("centre_id, role")
      .eq("user_id", uid);
    const staffCentres = new Set((staff ?? []).map((s: any) => s.centre_id as string));
    const isCentreStaff = staffCentres.size > 0;

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "");
    const dryRun = !!body?.dry_run;
    const scopeCentreId = body?.centre_id ? String(body.centre_id) : null;
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!kind) return json(400, { error: "kind is required" });
    if (rows.length === 0) return json(400, { error: "rows is empty" });
    if (rows.length > 2000) return json(400, { error: "Max 2000 rows per request" });

    // Authorization per kind
    if (kind === "centres" && !isAnyAdmin) return json(403, { error: "Admins only" });
    if (kind === "enrollments" && !isAnyAdmin) return json(403, { error: "Admins only" });
    if ((kind === "students" || kind === "centre_courses") && !isAnyAdmin && !isCentreStaff) {
      return json(403, { error: "Not authorised" });
    }

    // For centre-staff scoped imports, lock to their centre
    let forcedCentreId: string | null = null;
    if (!isAnyAdmin && isCentreStaff) {
      if (!scopeCentreId || !staffCentres.has(scopeCentreId)) {
        // Default to first membership if none provided
        forcedCentreId = [...staffCentres][0];
      } else {
        forcedCentreId = scopeCentreId;
      }
    } else if (isAnyAdmin && scopeCentreId) {
      forcedCentreId = scopeCentreId;
    }

    const results: RowResult[] = [];

    if (kind === "centres") {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const city = trimOrNull(r.city);
          if (!city) throw new Error("city is required");
          const slug = trimOrNull(r.slug) ?? slugify(`${city}-${trimOrNull(r.area) ?? ""}`);
          const payload: Record<string, any> = {
            slug,
            city,
            area: trimOrNull(r.area),
            state: trimOrNull(r.state) ?? "Rajasthan",
            address: trimOrNull(r.address),
            phone: trimOrNull(r.phone),
            email: trimOrNull(r.email),
            latitude: toNum(r.latitude),
            longitude: toNum(r.longitude),
            is_active: r.is_active == null ? true : toBool(r.is_active),
            is_pinned: toBool(r.is_pinned),
            is_featured: toBool(r.is_featured),
          };
          if (dryRun) {
            results.push({ row: i + 1, ok: true });
            continue;
          }
          const { data, error } = await admin
            .from("centres")
            .upsert(payload, { onConflict: "slug" })
            .select("id")
            .single();
          if (error) throw error;
          results.push({ row: i + 1, ok: true, id: data.id });
        } catch (e: any) {
          results.push({ row: i + 1, ok: false, error: e.message ?? String(e) });
        }
      }
    } else if (kind === "students") {
      // Preload centres + batches for name-based lookups (admin bulk create flow)
      const { data: centresList } = await admin
        .from("centres")
        .select("id, slug, city, area");
      const { data: batchesList } = await admin
        .from("course_batches")
        .select("id, name, code");
      const centreByKey = new Map<string, string>();
      (centresList ?? []).forEach((c: any) => {
        const keys = [c.slug, c.city, c.area, `${c.city} ${c.area ?? ""}`.trim()]
          .filter(Boolean)
          .map((k: string) => k.toLowerCase().trim());
        keys.forEach((k) => centreByKey.set(k, c.id));
      });
      const batchByKey = new Map<string, string>();
      (batchesList ?? []).forEach((b: any) => {
        if (b.name) batchByKey.set(String(b.name).toLowerCase().trim(), b.id);
        if (b.code) batchByKey.set(String(b.code).toLowerCase().trim(), b.id);
      });

      const normStream = (v: any): string | null => {
        const s = trimOrNull(v);
        if (!s) return null;
        const u = s.toUpperCase();
        if (u.includes("NEET")) return "NEET";
        if (u.includes("JEE")) return "JEE";
        return s;
      };
      const normClass = (v: any): string | null => {
        const s = trimOrNull(v);
        if (!s) return null;
        const u = s.toUpperCase().replace(/CLASS\s*/i, "").trim();
        const map: Record<string, string> = {
          "XI": "Class 11", "11": "Class 11", "11TH": "Class 11",
          "XII": "Class 12", "12": "Class 12", "12TH": "Class 12",
          "XIII": "Dropper", "DROPPER": "Dropper",
          "IX": "Class 9", "9": "Class 9",
          "X": "Class 10", "10": "Class 10",
          "VIII": "Class 8", "8": "Class 8",
          "VII": "Class 7", "7": "Class 7",
          "VI": "Class 6", "6": "Class 6",
        };
        return map[u] ?? s;
      };
      const parseDob = (v: any): string | null => {
        if (v == null || v === "") return null;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        const s = String(v).trim();
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
          const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
          return `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        }
        return null;
      };

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const phone = trimOrNull(r.phone ?? r.contact_no);
          const roll = trimOrNull(r.roll_number ?? r.roll_no);
          const fullName = trimOrNull(r.full_name ?? r.student_name);
          if (!roll && !phone) throw new Error("roll_number or phone is required");

          const validStatus = ["active", "inactive", "passed_out", "dropped"];
          const status = r.student_status
            ? String(r.student_status).trim().toLowerCase().replace(/\s+/g, "_")
            : null;
          if (status && !validStatus.includes(status))
            throw new Error("student_status must be active/inactive/passed_out/dropped");

          // Resolve centre
          let centreId: string | null = forcedCentreId;
          if (!centreId && r.centre_id) centreId = String(r.centre_id);
          if (!centreId && r.centre) {
            const key = String(r.centre).toLowerCase().trim();
            centreId = centreByKey.get(key) ?? null;
            if (!centreId) throw new Error(`Centre not found: ${r.centre}`);
          }

          // Resolve batch
          let batchId: string | null = null;
          const batchRaw = trimOrNull(r.batch);
          if (r.batch_id) batchId = String(r.batch_id);
          else if (batchRaw) {
            const key = batchRaw.toLowerCase();
            batchId = batchByKey.get(key) ?? null;
          }

          // Find existing profile
          let target: { id: string; user_id: string } | null = null;
          if (roll) {
            const { data } = await admin
              .from("profiles")
              .select("id, user_id")
              .eq("roll_number", roll)
              .maybeSingle();
            target = data as any;
          }
          if (!target && phone) {
            const { data } = await admin
              .from("profiles")
              .select("id, user_id")
              .eq("phone", phone)
              .maybeSingle();
            target = data as any;
          }

          const toE164In = (p: string | null): string | null => {
            if (!p) return null;
            const digits = p.replace(/\D/g, "");
            if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
            if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
            return null;
          };

          const payload: Record<string, any> = {};
          if (fullName) payload.full_name = fullName;
          if (trimOrNull(r.father_name ?? r.fathers_name)) payload.father_name = trimOrNull(r.father_name ?? r.fathers_name);
          if (phone) {
            payload.phone = phone;
            const e164 = toE164In(phone);
            if (e164) {
              payload.phone_e164 = e164;
              payload.phone_verified = true;
            }
          }
          if (trimOrNull(r.parent_phone ?? r.parent_no)) payload.parent_phone = trimOrNull(r.parent_phone ?? r.parent_no);
          const dob = parseDob(r.dob);
          if (dob) payload.dob = dob;
          const stream = normStream(r.target_exam ?? r.stream);
          if (stream) payload.target_exam = stream;
          const cls = normClass(r.class_level ?? r.class);
          if (cls) payload.class_level = cls;
          if (centreId) payload.centre_id = centreId;
          if (batchId) payload.batch_id = batchId;
          if (batchRaw) payload.batch_label = batchRaw;
          if (roll) payload.roll_number = roll;
          if (trimOrNull(r.city)) payload.city = trimOrNull(r.city);
          if (status) payload.student_status = status;
          payload.is_bansal_offline_student = true;
          payload.onboarding_completed = true;

          if (target) {
            if (dryRun) { results.push({ row: i + 1, ok: true, id: target.id }); continue; }
            const { error } = await admin.from("profiles").update(payload).eq("id", target.id);
            if (error) throw error;
            results.push({ row: i + 1, ok: true, id: target.id });
          } else {
            // Create new student (admins only)
            if (!isAnyAdmin) throw new Error("Student not found — only admins can create new students via bulk import");
            if (!fullName) throw new Error("full_name (Student Name) is required to create a new student");
            if (dryRun) { results.push({ row: i + 1, ok: true }); continue; }

            const emailSeed = roll
              ? `roll-${roll}`
              : `phone-${phone}`;
            const email = `${emailSeed}@bansal.ac.in`.toLowerCase().replace(/[^a-z0-9@.\-]/g, "");
            const password = `Bansal@${Math.random().toString(36).slice(2, 10)}`;

            const { data: created, error: cErr } = await admin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: fullName, source: "bulk_import" },
            });
            if (cErr || !created?.user) throw new Error(cErr?.message || "Failed to create auth user");
            const newUid = created.user.id;

            // Profile may have been auto-created by trigger; upsert
            const { data: existingProfile } = await admin
              .from("profiles")
              .select("id")
              .eq("user_id", newUid)
              .maybeSingle();
            if (existingProfile) {
              const { error } = await admin.from("profiles").update(payload).eq("id", (existingProfile as any).id);
              if (error) throw error;
            } else {
              const { error } = await admin.from("profiles").insert({ user_id: newUid, ...payload });
              if (error) throw error;
            }

            await admin.from("user_roles").upsert(
              { user_id: newUid, role: "student" },
              { onConflict: "user_id,role" },
            );

            results.push({ row: i + 1, ok: true, id: newUid });
          }
        } catch (e: any) {
          results.push({ row: i + 1, ok: false, error: e.message ?? String(e) });
        }
      }
    } else if (kind === "centre_courses") {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const title = trimOrNull(r.title);
          if (!title) throw new Error("title is required");
          const centre_id = forcedCentreId ?? trimOrNull(r.centre_id);
          if (!centre_id) throw new Error("centre_id is required");
          if (!isAnyAdmin && !staffCentres.has(centre_id))
            throw new Error("Not authorised for this centre");
          const slug = trimOrNull(r.slug) ?? slugify(title);
          const payload: Record<string, any> = {
            centre_id,
            slug,
            title,
            subtitle: trimOrNull(r.subtitle),
            description: trimOrNull(r.description),
            duration: trimOrNull(r.duration),
            target_exam: trimOrNull(r.target_exam),
            class_level: trimOrNull(r.class_level),
            price: toNum(r.price),
            is_active: r.is_active == null ? true : toBool(r.is_active),
          };
          if (dryRun) {
            results.push({ row: i + 1, ok: true });
            continue;
          }
          const { data, error } = await admin
            .from("centre_courses")
            .upsert(payload, { onConflict: "centre_id,slug" })
            .select("id")
            .single();
          if (error) throw error;
          results.push({ row: i + 1, ok: true, id: data.id });
        } catch (e: any) {
          results.push({ row: i + 1, ok: false, error: e.message ?? String(e) });
        }
      }
    } else if (kind === "enrollments") {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const courseSlug = trimOrNull(r.course_slug);
          const courseId = trimOrNull(r.course_id);
          if (!courseSlug && !courseId) throw new Error("course_slug or course_id is required");
          const email = trimOrNull(r.email);
          const phone = trimOrNull(r.phone);
          const roll = trimOrNull(r.roll_number);
          if (!email && !phone && !roll)
            throw new Error("email, phone or roll_number is required");

          // Resolve course
          let resolvedCourseId = courseId;
          if (!resolvedCourseId && courseSlug) {
            const { data: c } = await admin
              .from("courses")
              .select("id")
              .eq("slug", courseSlug)
              .maybeSingle();
            if (!c) throw new Error(`Course not found: ${courseSlug}`);
            resolvedCourseId = (c as any).id;
          }

          // Resolve user via profile
          let userId: string | null = null;
          if (roll) {
            const { data: p } = await admin
              .from("profiles")
              .select("id")
              .eq("roll_number", roll)
              .maybeSingle();
            userId = (p as any)?.id ?? null;
          }
          if (!userId && phone) {
            const { data: p } = await admin
              .from("profiles")
              .select("id")
              .eq("phone", phone)
              .maybeSingle();
            userId = (p as any)?.id ?? null;
          }
          if (!userId && email) {
            const { data: u } = await admin
              .from("auth_users_view" as any)
              .select("id")
              .eq("email", email)
              .maybeSingle()
              .then((res: any) => res, () => ({ data: null }));
            if (u) userId = (u as any).id;
            if (!userId) {
              // Fallback: query auth.admin
              const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
              const match = list?.users?.find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
              if (match) userId = match.id;
            }
          }
          if (!userId)
            throw new Error("No user matches that email/phone/roll — student must sign up first");

          const payload: Record<string, any> = {
            user_id: userId,
            course_id: resolvedCourseId,
            progress_percent: toNum(r.progress_percent) ?? 0,
            completed_lessons: toNum(r.completed_lessons) ?? 0,
            is_active: r.is_active == null ? true : toBool(r.is_active),
          };
          if (dryRun) {
            results.push({ row: i + 1, ok: true });
            continue;
          }
          const { data, error } = await admin
            .from("enrollments")
            .upsert(payload, { onConflict: "user_id,course_id" })
            .select("id")
            .single();
          if (error) throw error;
          results.push({ row: i + 1, ok: true, id: (data as any).id });
        } catch (e: any) {
          results.push({ row: i + 1, ok: false, error: e.message ?? String(e) });
        }
      }
    } else {
      return json(400, { error: `Unknown kind: ${kind}` });
    }

    const ok = results.filter((r) => r.ok).length;
    const errors = results.length - ok;
    return json(200, { ok, errors, dry_run: dryRun, results });
  } catch (e: any) {
    console.error("bulk-import error", e);
    return json(500, { error: e?.message ?? "Internal error" });
  }
});
