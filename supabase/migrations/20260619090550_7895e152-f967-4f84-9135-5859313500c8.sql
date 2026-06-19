
-- 1. Chapter quiz answers: revoke from anon/authenticated; served by get_chapter_quiz_answers (SECURITY DEFINER)
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM anon, authenticated;

-- 2. Test question answer keys: revoke from anon/authenticated; served by get_test_question_answers / admin_get_test_questions_full
REVOKE SELECT (correct_answer, numerical_answer, explanation, tolerance, solution_image_url)
  ON public.test_questions FROM anon, authenticated;

-- 3. Question bank answer keys: revoke from anon/authenticated; served by admin_get_question_bank_full
REVOKE SELECT (correct_answer, numerical_answer, explanation)
  ON public.question_bank FROM anon, authenticated;

-- 4. Lesson video URLs: revoke from anon/authenticated; served by get_lesson_video_url
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;

-- 5. Live class meeting/recording URLs: revoke from anon/authenticated; served by get_live_class_join_url
REVOKE SELECT (meeting_url, recording_url) ON public.live_classes FROM anon, authenticated;

-- 6. course_pdfs: require enrollment OR staff
DROP POLICY IF EXISTS "Auth users view pdfs of published courses" ON public.course_pdfs;
CREATE POLICY "Enrolled or staff view course pdfs"
  ON public.course_pdfs
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_pdfs.course_id
        AND e.user_id = auth.uid()
        AND e.is_active = true
    )
  );

-- 7. Admin helper to fetch lesson video URLs for the course-content editor
CREATE OR REPLACE FUNCTION public.admin_get_lessons_full(_course_id uuid)
RETURNS TABLE (id uuid, video_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.video_url
  FROM public.lessons l
  WHERE l.course_id = _course_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.admin_get_lessons_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_lessons_full(uuid) TO authenticated;
