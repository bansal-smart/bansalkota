
-- 1. Function search_path fixes + revoke EXECUTE on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;

-- 2. educator-uploads storage hardening
DROP POLICY IF EXISTS "Anyone can upload educator files" ON storage.objects;
DROP POLICY IF EXISTS "Public read educator uploads" ON storage.objects;

CREATE POLICY "Authenticated upload educator files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'educator-uploads');

-- bucket is public so direct GET URLs work; no broad SELECT needed for listing

-- 3. mentor-chat-files / mentor-chat-images SELECT tightening
DROP POLICY IF EXISTS "mentor chat read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "mentor chat files read authenticated" ON storage.objects;

CREATE POLICY "mentor chat images read participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mentor-chat-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.mentor_messages m
      WHERE m.file_path = storage.objects.name
        AND (
          m.sender_id = auth.uid()
          OR m.recipient_id = auth.uid()
          OR (m.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.mentor_group_members gm
            WHERE gm.group_id = m.group_id AND gm.student_id = auth.uid()
          ))
          OR (m.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.mentor_groups g
            WHERE g.id = m.group_id AND g.mentor_id = auth.uid()
          ))
        )
    )
  )
);

CREATE POLICY "mentor chat files read participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mentor-chat-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.mentor_messages m
      WHERE m.file_path = storage.objects.name
        AND (
          m.sender_id = auth.uid()
          OR m.recipient_id = auth.uid()
          OR (m.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.mentor_group_members gm
            WHERE gm.group_id = m.group_id AND gm.student_id = auth.uid()
          ))
          OR (m.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.mentor_groups g
            WHERE g.id = m.group_id AND g.mentor_id = auth.uid()
          ))
        )
    )
  )
);

-- 4. course-resources storage: enrolled users + staff only
DROP POLICY IF EXISTS "Authenticated can read course resource files" ON storage.objects;

CREATE POLICY "Enrolled users read course resource files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-resources'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.course_resources cr
      JOIN public.enrollments e ON e.course_id = cr.course_id AND e.user_id = auth.uid() AND e.is_active = true
      WHERE cr.file_url LIKE '%' || storage.objects.name
    )
  )
);

-- 5. course_resources table: hide file_url for non-enrolled
DROP POLICY IF EXISTS "Anyone can view published resources of published courses" ON public.course_resources;

CREATE POLICY "Public can view published resource metadata"
ON public.course_resources FOR SELECT TO anon, authenticated
USING (
  is_published = true
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_resources.course_id AND c.is_published = true)
);

-- column-level: revoke file_url from anon, allow only authenticated with enrollment via separate policy is hard.
-- Simpler: revoke file_url from anon entirely; authenticated still see it but app should gate. Below we revoke from anon.
REVOKE SELECT (file_url) ON public.course_resources FROM anon;

-- 6. live_classes: hide meeting_url / recording_url from non-participants
DROP POLICY IF EXISTS "Live classes viewable by authenticated" ON public.live_classes;

CREATE POLICY "Authenticated view live class metadata"
ON public.live_classes FOR SELECT TO authenticated
USING (true);

-- Hide sensitive URL columns from generic SELECT; expose via SECURITY DEFINER function.
REVOKE SELECT (meeting_url, recording_url) ON public.live_classes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_live_class_join_url(_class_id uuid)
RETURNS TABLE(meeting_url text, recording_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT lc.meeting_url, lc.recording_url
  FROM public.live_classes lc
  WHERE lc.id = _class_id
    AND (
      lc.created_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.live_class_attendance a
        WHERE a.class_id = lc.id AND a.user_id = auth.uid()
      )
      OR (
        lc.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = lc.course_id AND e.user_id = auth.uid() AND e.is_active = true
        )
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_class_join_url(uuid) TO authenticated;

-- 7. chapter_quiz_questions: hide correct_index / explanation from generic SELECT
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_chapter_quiz_answers(_quiz_id uuid)
RETURNS TABLE(id uuid, correct_index integer, explanation text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chapter_quiz_attempts WHERE quiz_id = _quiz_id AND user_id = auth.uid()
  ) AND NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Must submit quiz before viewing answers';
  END IF;
  RETURN QUERY
  SELECT q.id, q.correct_index, q.explanation
  FROM public.chapter_quiz_questions q
  WHERE q.quiz_id = _quiz_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chapter_quiz_answers(uuid) TO authenticated;

-- 8. test_questions: hide correct_answer / explanation from generic SELECT
REVOKE SELECT (correct_answer, explanation) ON public.test_questions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_test_question_answers(_test_id uuid)
RETURNS TABLE(id uuid, correct_answer jsonb, explanation text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.test_attempts
    WHERE test_id = _test_id AND user_id = auth.uid()
      AND status IN ('submitted','auto_submitted')
  ) AND NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Must submit test before viewing answers';
  END IF;
  RETURN QUERY
  SELECT q.id, q.correct_answer, q.explanation
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_question_answers(uuid) TO authenticated;

-- 9. compete_questions: hide correct_index / explanation from generic SELECT
REVOKE SELECT (correct_index, explanation) ON public.compete_questions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_compete_question_answers(_match_id uuid)
RETURNS TABLE(id uuid, correct_index integer, explanation text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.compete_matches m
    WHERE m.id = _match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
      AND m.status IN ('completed','finished','in_progress','active')
  ) AND NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized for this match';
  END IF;
  RETURN QUERY
  SELECT q.id, q.correct_index, q.explanation
  FROM public.compete_questions q
  JOIN public.compete_matches m ON m.id = _match_id
  WHERE q.id = ANY(m.question_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_compete_question_answers(uuid) TO authenticated;

-- 10. Schools: restrict contact details to staff only
DROP POLICY IF EXISTS "Authenticated read schools" ON public.schools;

CREATE POLICY "Authenticated read school basic info"
ON public.schools FOR SELECT TO authenticated
USING (is_active = true OR is_admin_or_super(auth.uid()));

REVOKE SELECT (contact_email, contact_phone, contact_person) ON public.schools FROM anon, authenticated;
GRANT SELECT (contact_email, contact_phone, contact_person) ON public.schools TO service_role;

-- 11. Teachers viewing profiles: restrict to students with doubts assigned to them
DROP POLICY IF EXISTS "Teachers can view profiles" ON public.profiles;

CREATE POLICY "Teachers can view assigned doubt student profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.doubts d
    WHERE d.assigned_teacher_id = auth.uid() AND d.user_id = profiles.user_id
  )
);
