
DROP POLICY IF EXISTS "Teachers insert own bank questions" ON public.question_bank;
CREATE POLICY "Teachers insert own bank questions"
ON public.question_bank
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.has_role(auth.uid(), 'teacher'::app_role)
);

DROP POLICY IF EXISTS "Teachers update own bank questions" ON public.question_bank;
CREATE POLICY "Teachers update own bank questions"
ON public.question_bank
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers delete own bank questions" ON public.question_bank;
CREATE POLICY "Teachers delete own bank questions"
ON public.question_bank
FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers manage own test questions" ON public.test_questions;
CREATE POLICY "Teachers manage own test questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'teacher'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'teacher'::app_role)
  )
);
