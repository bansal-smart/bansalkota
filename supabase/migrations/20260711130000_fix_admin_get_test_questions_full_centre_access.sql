-- admin_get_test_questions_full (20260619072544_...sql) only allowed
-- admin/super_admin/teacher(owner) — teacher role was removed 2026-07-06 and
-- centre-scoped tests (centre_id added 20260704190000_centre_scoped_tests_and_series.sql)
-- were never granted access, so any centre_admin opening their own centre's
-- test in edit mode gets "forbidden" from this RPC. Mirrors the same fix
-- already applied to admin_get_question_bank_full in
-- 20260704200100_centre_question_bank_full_rpc.sql.
CREATE OR REPLACE FUNCTION public.admin_get_test_questions_full(_test_id uuid)
RETURNS TABLE (
  id uuid,
  correct_answer jsonb,
  numerical_answer numeric,
  explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = _test_id
        AND t.centre_id IS NOT NULL
        AND public.is_centre_staff(auth.uid(), t.centre_id)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_answer::jsonb, q.numerical_answer, q.explanation
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_test_questions_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_test_questions_full(uuid) TO authenticated;
