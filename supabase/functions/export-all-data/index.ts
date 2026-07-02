// Migration-only export endpoint for the OLD (Lovable Cloud) project.
// Reads with the service role (never exposed to the caller) and returns JSON.
// Auth: static shared secret via x-migration-key header, checked against the
// MIGRATION_EXPORT_KEY function secret — set that secret in Lovable before deploying,
// and delete this function once the migration is complete.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-migration-key",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Every public-schema table in this app. Export order doesn't matter here —
// FK-safe insert order is resolved on the import side from live FK metadata.
const TABLES = [
  "achievement_posters", "active_sessions", "alumni_submissions", "books",
  "boost_registrations", "boost_settings", "centre_banners", "centre_carousel_banners",
  "centre_course_enquiries", "centre_courses", "centre_gallery", "centre_online_chapters",
  "centre_online_courses", "centre_online_lessons", "centre_staff", "centre_updates",
  "centres", "chapter_quiz_attempts", "chapter_quiz_questions", "chapter_quizzes",
  "chapters", "course_batches", "course_enquiries", "course_pdfs", "course_resources",
  "course_reviews", "course_subjects", "course_subtopics", "course_topics", "courses",
  "doubt_answers", "doubts", "educator_follows", "email_send_log", "email_send_state",
  "email_unsubscribe_tokens", "enquiries", "enrollments", "exams", "gallery_album_images",
  "gallery_albums", "landing_hero_banners", "landing_page_config", "landing_page_leads",
  "leadership_profiles", "leadership_sections", "lecture_bucket", "lesson_notes",
  "lesson_progress", "lessons", "live_class_attendance", "live_class_messages",
  "live_class_templates", "live_classes", "module_pack_items", "module_packs",
  "notification_preferences", "notifications", "order_items", "orders", "payments",
  "phone_otps", "phone_verifications", "platform_settings", "profiles",
  "question_bank", "question_import_batches", "reports", "schools", "site_banners",
  "site_pages", "site_stats", "site_testimonials", "sms_broadcast_recipients",
  "sms_broadcasts", "sms_send_log", "study_sessions", "subtopic_pdfs",
  "subtopic_quiz_attempts", "subtopic_quiz_questions", "subtopic_quizzes",
  "subtopic_video_notes", "subtopic_video_progress", "subtopic_videos",
  "suppressed_emails", "test_attempt_answer_snapshots", "test_attempts",
  "test_leaderboard_cache", "test_question_bonus_log", "test_question_reports",
  "test_questions", "test_reattempt_requests", "test_result_exclusions", "test_series",
  "test_support_queries", "tests", "toppers", "user_roles",
];

const PAGE_SIZE = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const key = req.headers.get("x-migration-key");
  if (!key || key !== Deno.env.get("MIGRATION_EXPORT_KEY")) {
    return json(401, { error: "Unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "table";

  try {
    if (action === "tables") {
      return json(200, { tables: TABLES });
    }

    if (action === "table") {
      const table = url.searchParams.get("table") ?? "";
      if (!TABLES.includes(table)) {
        return json(400, { error: `Unknown or missing table: ${table}` });
      }
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const { data, error, count } = await admin
        .from(table)
        .select("*", { count: "exact" })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      return json(200, {
        table,
        offset,
        limit: PAGE_SIZE,
        rows: data,
        returned: data?.length ?? 0,
        total: count,
        done: (data?.length ?? 0) < PAGE_SIZE,
      });
    }

    // GoTrue admin API never returns password/token material — only identity fields.
    if (action === "auth_users") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const perPage = 1000;
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = (data?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        email_confirmed_at: u.email_confirmed_at,
        phone_confirmed_at: u.phone_confirmed_at,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_sign_in_at: u.last_sign_in_at,
        raw_user_meta_data: u.user_metadata,
        raw_app_meta_data: u.app_metadata,
        role: u.role,
      }));
      return json(200, { page, perPage, users, done: users.length < perPage });
    }

    if (action === "buckets") {
      const { data, error } = await admin.storage.listBuckets();
      if (error) throw error;
      return json(200, { buckets: data });
    }

    // Not recursive — an entry with id === null is a folder; caller recurses with
    // prefix = `${prefix}${entry.name}/`.
    if (action === "objects") {
      const bucket = url.searchParams.get("bucket") ?? "";
      if (!bucket) return json(400, { error: "bucket is required" });
      const prefix = url.searchParams.get("prefix") ?? "";
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      return json(200, {
        bucket,
        prefix,
        offset,
        objects: data,
        done: (data?.length ?? 0) < PAGE_SIZE,
      });
    }

    if (action === "signed-url") {
      const bucket = url.searchParams.get("bucket") ?? "";
      const path = url.searchParams.get("path") ?? "";
      if (!bucket || !path) return json(400, { error: "bucket and path are required" });
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
      if (error) throw error;
      return json(200, { bucket, path, signedUrl: data.signedUrl });
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (e: any) {
    console.error("export-all-data error", e);
    return json(500, { error: e?.message ?? "Internal error" });
  }
});
