DROP POLICY IF EXISTS "Staff manage all tests" ON public.tests;
DROP POLICY IF EXISTS "View questions of accessible tests" ON public.test_questions;
DROP POLICY IF EXISTS "Staff manage all test questions" ON public.test_questions;

CREATE POLICY "Staff manage all tests"
ON public.tests
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
);

CREATE POLICY "View questions of accessible tests"
ON public.test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND (
        t.is_published = true
        OR t.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.has_role(auth.uid(), 'teacher'::public.app_role)
      )
  )
);

CREATE POLICY "Staff manage all test questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
);