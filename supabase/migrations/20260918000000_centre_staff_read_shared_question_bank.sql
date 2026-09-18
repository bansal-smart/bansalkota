-- Reinstates the shared-parent / private-child model for the Question Bank:
-- centre staff can READ Bansal's global bank (centre_id IS NULL) but cannot
-- author, edit or delete it — that stays admin/super_admin only. Centre staff
-- keep full CRUD on their own centre's rows only (unchanged, see
-- "Centre admins manage own centre question bank"), and never see another
-- centre's rows. This intentionally reverses the read restriction added in
-- 20260704200200_question_bank_no_global_read_for_centre.sql, per updated
-- product direction: every centre admin should see the shared bank, and
-- anything a centre admin adds stays private to their own centre.

CREATE POLICY "Centre staff view global question bank"
ON public.question_bank
FOR SELECT
TO authenticated
USING (
  centre_id IS NULL
  AND public.is_any_centre_staff(auth.uid())
);

-- Let centre staff resolve the gated answer/explanation columns for global
-- questions too (previously only their own rows or rows in their own centre
-- were exposed here), so the shared bank renders correctly for them.
CREATE OR REPLACE FUNCTION public.admin_get_question_bank_full(_ids uuid[])
 RETURNS TABLE(id uuid, correct_answer jsonb, numerical_answer numeric, explanation text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      OR (q.centre_id IS NULL AND public.is_any_centre_staff(auth.uid()))
    );
END;
$function$;
