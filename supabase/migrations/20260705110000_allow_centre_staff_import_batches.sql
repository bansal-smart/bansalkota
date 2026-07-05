-- question_import_batches only allowed admin/super_admin/teacher to create
-- (and admin/super_admin/owner to view/update/delete) import batches, so
-- centre admins hit an RLS violation (42501) importing questions via the
-- DOCX/Common-import flow at /center/question-bank and /center/tests/new.
-- Add centre-staff access, scoped to batches they themselves uploaded
-- (uploaded_by = auth.uid()), matching the "own row" pattern already used
-- for their question_bank/tests/test_series rows.

DROP POLICY IF EXISTS "Staff create import batches" ON public.question_import_batches;
CREATE POLICY "Staff create import batches"
ON public.question_import_batches
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR is_any_centre_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Staff view import batches" ON public.question_import_batches;
CREATE POLICY "Staff view import batches"
ON public.question_import_batches
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Staff update own import batches" ON public.question_import_batches;
CREATE POLICY "Staff update own import batches"
ON public.question_import_batches
FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
