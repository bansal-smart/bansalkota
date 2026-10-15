-- Centres must not edit or delete global tests (a test owned by a centre can
-- still be marked global by a super admin). Only admins/super admins and the
-- HQ centre keep write access to a global test. Questions follow the same rule.
CREATE OR REPLACE FUNCTION public.centre_may_write_test(_centre_id uuid, _is_global boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE(_is_global, false)
      OR EXISTS (SELECT 1 FROM public.centres c WHERE c.id = _centre_id AND c.is_hq)
$$;

DROP POLICY IF EXISTS "Centre admins manage own centre tests" ON public.tests;
CREATE POLICY "Centre admins manage own centre tests"
ON public.tests FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id)
  AND public.centre_may_write_test(centre_id, is_global)
)
WITH CHECK (
  centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id)
  AND public.centre_may_write_test(centre_id, is_global)
);

DROP POLICY IF EXISTS "Centre staff manage their own tests" ON public.tests;
CREATE POLICY "Centre staff manage their own tests"
ON public.tests FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.centre_may_write_test(centre_id, is_global)
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL AND is_global = false
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
);

DROP POLICY IF EXISTS "Creators manage own tests" ON public.tests;
CREATE POLICY "Creators manage own tests"
ON public.tests FOR ALL TO authenticated
USING (created_by = auth.uid() AND public.centre_may_write_test(centre_id, is_global))
WITH CHECK (created_by = auth.uid() AND public.centre_may_write_test(centre_id, is_global));

DROP POLICY IF EXISTS "Super admins can delete tests" ON public.tests;
CREATE POLICY "Super admins can delete tests"
ON public.tests FOR DELETE TO authenticated
USING (
  (centre_id IS NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
  OR (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id)
      AND public.centre_may_write_test(centre_id, is_global))
);

DROP POLICY IF EXISTS "Centre admins manage own centre test questions" ON public.test_questions;
CREATE POLICY "Centre admins manage own centre test questions"
ON public.test_questions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = test_questions.test_id AND t.centre_id IS NOT NULL
    AND public.is_centre_staff(auth.uid(), t.centre_id)
    AND public.centre_may_write_test(t.centre_id, t.is_global)
));

DROP POLICY IF EXISTS "Centre staff manage questions of their own tests" ON public.test_questions;
CREATE POLICY "Centre staff manage questions of their own tests"
ON public.test_questions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = test_questions.test_id AND t.centre_id IS NOT NULL
    AND public.centre_may_write_test(t.centre_id, t.is_global)
    AND public.has_permission(auth.uid(), 'test_platform', 'edit', t.centre_id)
));
