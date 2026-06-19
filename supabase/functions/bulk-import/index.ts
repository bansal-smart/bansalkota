// Generic bulk-import edge function.
// Kinds: 'centres' | 'students' | 'centre_courses'
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
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const phone = trimOrNull(r.phone);
          const roll = trimOrNull(r.roll_number);
          if (!phone && !roll) throw new Error("phone or roll_number is required");
          const validStatus = ["active", "inactive", "passed_out", "dropped"];
          const status = r.student_status
            ? String(r.student_status).trim().toLowerCase().replace(/\s+/g, "_")
            : null;
          if (status && !validStatus.includes(status))
            throw new Error("student_status must be active/inactive/passed_out/dropped");

          // Find profile
          let target: { id: string } | null = null;
          if (roll) {
            const { data } = await admin
              .from("profiles")
              .select("id")
              .eq("roll_number", roll)
              .maybeSingle();
            target = data as any;
          }
          if (!target && phone) {
            const { data } = await admin
              .from("profiles")
              .select("id")
              .eq("phone", phone)
              .maybeSingle();
            target = data as any;
          }
          if (!target)
            throw new Error("No profile matches that roll number or phone — student must sign up first");

          const update: Record<string, any> = {};
          if (forcedCentreId) update.centre_id = forcedCentreId;
          else if (r.centre_id) update.centre_id = String(r.centre_id);
          if (r.full_name) update.full_name = String(r.full_name).trim();
          if (r.class_level) update.class_level = String(r.class_level).trim();
          if (r.target_exam) update.target_exam = String(r.target_exam).trim();
          if (r.city) update.city = String(r.city).trim();
          if (status) update.student_status = status;
          if (roll) update.roll_number = roll;

          if (dryRun) {
            results.push({ row: i + 1, ok: true, id: target.id });
            continue;
          }
          const { error } = await admin.from("profiles").update(update).eq("id", target.id);
          if (error) throw error;
          results.push({ row: i + 1, ok: true, id: target.id });
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
