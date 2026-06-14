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
    AND (t.ends_at IS NULL OR now() <= t.ends_at)
    AND (
      t.cbt_allowed_batch_ids IS NULL
      OR array_length(t.cbt_allowed_batch_ids, 1) IS NULL
      OR _batch_id = ANY(t.cbt_allowed_batch_ids)
    )
  ORDER BY COALESCE(t.starts_at, t.created_at) ASC;
$$;