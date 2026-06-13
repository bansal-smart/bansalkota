-- Add test_mode column
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_mode text NOT NULL DEFAULT 'digital';
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_test_mode_check;
ALTER TABLE public.tests ADD CONSTRAINT tests_test_mode_check CHECK (test_mode IN ('digital','cbt'));

-- Backfill from cbt_enabled
UPDATE public.tests SET test_mode = 'cbt' WHERE cbt_enabled = true AND test_mode <> 'cbt';

-- RPC: live CBT tests for a student's batch
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
  WHERE t.test_mode = 'cbt'
    AND t.is_published = true
    AND (t.starts_at IS NULL OR now() >= t.starts_at)
    AND (t.ends_at   IS NULL OR now() <= t.ends_at)
    AND (
      t.cbt_allowed_batch_ids IS NULL
      OR array_length(t.cbt_allowed_batch_ids, 1) IS NULL
      OR _batch_id = ANY(t.cbt_allowed_batch_ids)
    )
  ORDER BY COALESCE(t.starts_at, t.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.cbt_live_tests_for_batch(uuid) TO authenticated, anon, service_role;