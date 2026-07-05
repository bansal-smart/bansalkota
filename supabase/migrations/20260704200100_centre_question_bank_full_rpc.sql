-- =========================================================================
-- Extend admin_get_question_bank_full (20260619072807_...sql) so centre
-- staff can fetch answer columns for their own centre's question-bank rows,
-- matching the new centre_id column/RLS added in
-- 20260704200000_centre_scoped_question_bank.sql. Existing admin/super_admin/
-- teacher/owner access is unchanged.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.admin_get_question_bank_full(_ids uuid[])
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
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.is_any_centre_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_answer::jsonb, q.numerical_answer, q.explanation
  FROM public.question_bank q
  WHERE q.id = ANY(_ids)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR q.created_by = auth.uid()
      OR (q.centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), q.centre_id))
    );
END;
$$;
