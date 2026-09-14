-- Allow a test to be available through both the LMS and CBT kiosk.
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS allows_digital_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_kiosk_mode boolean NOT NULL DEFAULT false;

-- Preserve the existing single-mode behavior for all existing tests.
UPDATE public.tests
SET allows_digital_mode = (test_mode = 'digital'),
    allows_kiosk_mode = (test_mode = 'cbt')
WHERE allows_digital_mode IS DISTINCT FROM (test_mode = 'digital')
   OR allows_kiosk_mode IS DISTINCT FROM (test_mode = 'cbt');

ALTER TABLE public.tests
  DROP CONSTRAINT IF EXISTS tests_at_least_one_mode_check;
ALTER TABLE public.tests
  ADD CONSTRAINT tests_at_least_one_mode_check
  CHECK (allows_digital_mode OR allows_kiosk_mode);

ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS attempt_mode text;
ALTER TABLE public.test_attempts
  DROP CONSTRAINT IF EXISTS test_attempts_attempt_mode_check;
ALTER TABLE public.test_attempts
  ADD CONSTRAINT test_attempts_attempt_mode_check
  CHECK (attempt_mode IS NULL OR attempt_mode IN ('digital', 'cbt'));

CREATE OR REPLACE FUNCTION public.cbt_live_tests_for_batch(_batch_id uuid)
RETURNS TABLE(
  id uuid, title text, description text, duration_minutes integer,
  total_questions integer, total_marks numeric,
  starts_at timestamptz, ends_at timestamptz, subjects text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.description, t.duration_minutes,
         t.total_questions, t.total_marks, t.starts_at, t.ends_at, t.subjects
  FROM public.tests t
  WHERE t.allows_kiosk_mode = true
    AND t.is_published = true
    AND (t.ends_at IS NULL OR now() <= t.ends_at)
    AND (
      t.cbt_allowed_batch_ids IS NULL
      OR array_length(t.cbt_allowed_batch_ids, 1) IS NULL
      OR _batch_id = ANY(t.cbt_allowed_batch_ids)
    )
  ORDER BY COALESCE(t.starts_at, t.created_at) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.cbt_live_tests_for_batch(uuid) TO authenticated, anon, service_role;
