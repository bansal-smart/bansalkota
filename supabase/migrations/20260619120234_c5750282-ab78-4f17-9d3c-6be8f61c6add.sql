
-- 1. Chapter quiz: revoke direct read on answer columns
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM anon, authenticated;

-- 2. Lessons: revoke direct read on video_url
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;

-- 3. Test questions: revoke direct read on answer/explanation/solution columns
REVOKE SELECT (correct_answer, explanation, numerical_answer, solution_image_url)
  ON public.test_questions FROM anon, authenticated;

-- 4. Live classes: replace overly permissive policy. Drop the unconditional (course_id IS NULL) branch.
DROP POLICY IF EXISTS "Enrolled, staff, or creator view live classes" ON public.live_classes;

CREATE POLICY "Enrolled, staff, or creator view live classes"
ON public.live_classes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR (created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = live_classes.course_id
      AND e.user_id = auth.uid()
      AND e.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.live_class_attendance a
    WHERE a.class_id = live_classes.id
      AND a.user_id = auth.uid()
  )
);
