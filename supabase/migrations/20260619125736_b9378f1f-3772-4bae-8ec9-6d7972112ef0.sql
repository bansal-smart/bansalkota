
-- 1) chapter_quiz_questions: hide correct_index and explanation from clients
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM anon, authenticated;

-- 2) lessons: hide video_url from clients (served via get_lesson_video_url)
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;

-- 3) test_questions: hide answer columns from clients (served via get_test_question_answers / admin RPCs)
REVOKE SELECT (correct_answer, numerical_answer, explanation, solution_image_url) ON public.test_questions FROM anon, authenticated;

-- 4) question_bank: hide answer columns from clients (served via admin_get_question_bank_full)
REVOKE SELECT (correct_answer, numerical_answer, explanation) ON public.question_bank FROM anon, authenticated;

-- 5) schools: hide institutional contact details from generic authenticated reads
REVOKE SELECT (contact_email, contact_phone, contact_person) ON public.schools FROM anon, authenticated;

-- 6) course_resources: restrict teacher reads to courses they are assigned to
DROP POLICY IF EXISTS "Enrolled or staff can view published resource metadata" ON public.course_resources;
CREATE POLICY "Enrolled or staff can view published resource metadata"
ON public.course_resources
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_resources.course_id
          AND c.assigned_teacher_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_resources.course_id
        AND e.user_id = auth.uid()
        AND e.is_active = true
    )
  )
);

-- 7) user_roles: belt-and-suspenders restrictive policy preventing self-escalation
-- (writes are already denied by default since no INSERT/UPDATE/DELETE policy exists,
-- but make the intent explicit and resilient to future permissive policies.)
DROP POLICY IF EXISTS "Only super admins manage roles" ON public.user_roles;
CREATE POLICY "Only super admins manage roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
