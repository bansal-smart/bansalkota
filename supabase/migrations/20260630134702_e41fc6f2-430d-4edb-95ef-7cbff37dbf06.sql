CREATE OR REPLACE FUNCTION public.admin_test_not_attempted(_test_id uuid)
RETURNS TABLE(user_id uuid, full_name text, roll_number text, batch_id uuid, batch_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_test FROM public.tests t WHERE t.id = _test_id;
  IF v_test IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;

  IF v_test.cbt_allowed_batch_ids IS NULL
     OR array_length(v_test.cbt_allowed_batch_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    NULLIF(trim(p.full_name), '')::text AS full_name,
    NULLIF(trim(p.roll_number), '')::text AS roll_number,
    p.batch_id,
    COALESCE(NULLIF(trim(cb.name), ''), NULLIF(trim(cb.code), ''))::text AS batch_name
  FROM public.profiles p
  LEFT JOIN public.course_batches cb ON cb.id = p.batch_id
  WHERE p.batch_id = ANY(v_test.cbt_allowed_batch_ids)
    AND p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.test_id = _test_id AND ta.user_id = p.user_id
    )
  ORDER BY cb.name NULLS LAST, p.roll_number NULLS LAST, p.full_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_test_not_attempted(uuid) TO authenticated;