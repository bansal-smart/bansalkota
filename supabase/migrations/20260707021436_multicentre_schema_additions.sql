-- Multi-Centre / HQ restructure — Phase 1, step 1: schema additions.
-- Adds the columns the franchise model needs. No data changes here (see the
-- backfill migration that follows). See docs/adr/0001-hq-franchise-content-scope.md.

-- Centres: suspension + per-centre roll-number codes + roll sequence counter.
ALTER TABLE public.centres
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS city_code text,     -- 3-letter, shared by all centres in a city (e.g. BLR)
  ADD COLUMN IF NOT EXISTS centre_code text,    -- 2-digit, unique within the city (e.g. 01)
  ADD COLUMN IF NOT EXISTS roll_seq integer NOT NULL DEFAULT 0; -- per-centre roll counter

-- Codes must be unique together where both are set (BLR/01 identifies one centre).
CREATE UNIQUE INDEX IF NOT EXISTS centres_city_centre_code_uniq
  ON public.centres (city_code, centre_code)
  WHERE city_code IS NOT NULL AND centre_code IS NOT NULL;

-- Courses: owner centre, global flag, fixed validity end date.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_date date;
CREATE INDEX IF NOT EXISTS idx_courses_centre ON public.courses(centre_id);

-- Enrollments: per-enrollment access expiry (mirrors course.end_date at enroll time).
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Tests / test series: global flag (both already carry centre_id).
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;
ALTER TABLE public.test_series
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- Batches: decouple from a single course.
--   * add `stream` (JEE / NEET / ...) so a batch = (centre, stream, class)
--   * make course_id nullable (franchise batches belong to no single course)
--   * add a partial uniqueness for decoupled batches so (centre, code) is unique
--     among franchise batches, while Kota's legacy course-linked batches keep
--     their existing UNIQUE (course_id, code).
ALTER TABLE public.course_batches
  ADD COLUMN IF NOT EXISTS stream text;
ALTER TABLE public.course_batches
  ALTER COLUMN course_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_batches_centre_code_uniq
  ON public.course_batches (centre_id, code)
  WHERE course_id IS NULL;
