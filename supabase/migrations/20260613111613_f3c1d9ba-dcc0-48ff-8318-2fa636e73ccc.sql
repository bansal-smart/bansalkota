
-- =========================================================================
-- 1. WIPE old test & question data + clear student data
-- =========================================================================

TRUNCATE TABLE
  public.test_attempts,
  public.test_reattempt_requests,
  public.test_questions,
  public.question_import_batches,
  public.question_bank
RESTART IDENTITY CASCADE;

DELETE FROM public.tests;

-- Delete student-only auth users (preserve admins/teachers/center_admins/super_admins)
DELETE FROM auth.users u
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'student'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = u.id
      AND r.role IN ('admin'::app_role,'super_admin'::app_role,'teacher'::app_role,'center_admin'::app_role)
  );

-- =========================================================================
-- 2. course_batches table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.course_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  center_id uuid REFERENCES public.centers(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  class_level text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_batches TO authenticated;
GRANT ALL ON public.course_batches TO service_role;

ALTER TABLE public.course_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active batches"
  ON public.course_batches FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage batches"
  ON public.course_batches FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_course_batches_updated
  BEFORE UPDATE ON public.course_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. profiles: batch_id + roll_number
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.course_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS roll_number text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_number_unique
  ON public.profiles (roll_number) WHERE roll_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_batch_id ON public.profiles(batch_id);

-- =========================================================================
-- 4. tests: CBT mode
-- =========================================================================

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS cbt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cbt_token text,
  ADD COLUMN IF NOT EXISTS cbt_allowed_batch_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE UNIQUE INDEX IF NOT EXISTS tests_cbt_token_unique
  ON public.tests (cbt_token) WHERE cbt_token IS NOT NULL;

-- Public lookup of a CBT test by token (no auth required for the login page)
CREATE OR REPLACE FUNCTION public.cbt_test_by_token(_token text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  duration_minutes integer,
  total_questions integer,
  total_marks numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  cbt_allowed_batch_ids uuid[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.title, t.description, t.duration_minutes, t.total_questions,
         t.total_marks, t.starts_at, t.ends_at, t.cbt_allowed_batch_ids
  FROM public.tests t
  WHERE t.cbt_token = _token AND t.cbt_enabled = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.cbt_test_by_token(text) TO anon, authenticated;

-- Helper used by the cbt-login edge function (service_role only)
CREATE OR REPLACE FUNCTION public.cbt_lookup_student(_roll text, _phone text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  batch_id uuid,
  phone text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name, p.batch_id, p.phone
  FROM public.profiles p
  WHERE p.roll_number = _roll
    AND p.phone = _phone
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.cbt_lookup_student(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cbt_lookup_student(text, text) TO service_role;
