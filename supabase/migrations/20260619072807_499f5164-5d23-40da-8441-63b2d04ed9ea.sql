-- question_bank: hide answer columns from clients (mirror test_questions pattern)
REVOKE SELECT (correct_answer, numerical_answer, explanation)
  ON public.question_bank FROM anon;
REVOKE SELECT (correct_answer, numerical_answer, explanation)
  ON public.question_bank FROM authenticated;

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
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_question_bank_full(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_question_bank_full(uuid[]) TO authenticated;

-- live_class_messages: restrict SELECT to staff or attendees of the class
DROP POLICY IF EXISTS "Authenticated can read class messages" ON public.live_class_messages;

CREATE POLICY "Attendees and staff can read class messages"
ON public.live_class_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.live_class_attendance a
    WHERE a.class_id = live_class_messages.class_id
      AND a.user_id = auth.uid()
  )
);

-- educator-uploads bucket: add owner/staff update + delete policies
CREATE POLICY "Educator uploads update own or staff"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'educator-uploads'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'educator-uploads'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Educator uploads delete own or staff"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'educator-uploads'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- mentor-chat-* buckets: add staff-only SELECT policies (legacy buckets,
-- mentor feature has been removed but buckets may still hold files)
CREATE POLICY "Mentor chat images admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentor-chat-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Mentor chat files admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentor-chat-files'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);