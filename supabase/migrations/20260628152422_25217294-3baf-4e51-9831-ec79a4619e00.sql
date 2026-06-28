
-- 1. Solution PDF columns on tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS solution_pdf_url text,
  ADD COLUMN IF NOT EXISTS solution_pdf_path text,
  ADD COLUMN IF NOT EXISTS solution_pdf_uploaded_at timestamptz;

-- 2. Realtime for test_attempts (admin Attempts tab live updates)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.test_attempts';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.test_attempts REPLICA IDENTITY FULL;

-- 3. Storage RLS for test-solutions bucket
-- Admins/teachers: full access. Authenticated students: read only when results released.
CREATE POLICY "test_solutions_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'test-solutions'
  AND (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'test-solutions'
  AND (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "test_solutions_student_read_released"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'test-solutions'
  AND EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.solution_pdf_path = storage.objects.name
      AND public.test_results_released(t.id)
  )
);

-- 4. Helper RPC: list students in test's allowed batches who have NOT attempted
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

  SELECT * INTO v_test FROM public.tests WHERE id = _test_id;
  IF v_test IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;

  -- Only return rows when the test has explicit allowed batches
  IF v_test.cbt_allowed_batch_ids IS NULL
     OR array_length(v_test.cbt_allowed_batch_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, p.roll_number, p.batch_id, cb.name
  FROM public.profiles p
  LEFT JOIN public.course_batches cb ON cb.id = p.batch_id
  WHERE p.batch_id = ANY(v_test.cbt_allowed_batch_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.test_id = _test_id AND ta.user_id = p.user_id
    );
END;
$$;
