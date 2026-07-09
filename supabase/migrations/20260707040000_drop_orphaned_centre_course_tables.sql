-- Drop the pre-Phase-1 centre-course tables. These predate the unified
-- courses(centre_id, is_global) model shipped in Phase 1/2 and have no
-- frontend page reading them; confirmed via row counts before this migration
-- (centre_courses=0, centre_course_enquiries=0, centre_online_courses=1,
-- centre_online_chapters=1, centre_online_lessons=6 — trivial test rows).
-- Future centre-created courses will use the existing `courses` table
-- (centre_id set, is_global=false, offline-only), not these tables.
DROP TABLE IF EXISTS public.centre_course_enquiries CASCADE;
DROP TABLE IF EXISTS public.centre_online_lessons CASCADE;
DROP TABLE IF EXISTS public.centre_online_chapters CASCADE;
DROP TABLE IF EXISTS public.centre_online_courses CASCADE;
DROP TABLE IF EXISTS public.centre_courses CASCADE;
