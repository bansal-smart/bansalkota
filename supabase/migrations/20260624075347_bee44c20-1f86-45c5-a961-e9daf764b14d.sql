
-- Tighten access to test answer keys, quiz answer keys, and centre online lesson video URLs

-- 1) test_questions: revoke sensitive answer columns from public roles.
--    Answer data is served via SECURITY DEFINER RPCs (e.g. get_test_question_answers).
--    Edge functions use service_role which retains full access.
REVOKE SELECT (correct_answer, explanation, numerical_answer, solution_image_url)
  ON public.test_questions FROM anon, authenticated;

-- 2) chapter_quiz_questions: restrict SELECT policy to authenticated users only,
--    and revoke answer columns from public roles. Answers come from get_chapter_quiz_answers RPC.
DROP POLICY IF EXISTS "View questions of viewable quizzes" ON public.chapter_quiz_questions;
CREATE POLICY "View questions of viewable quizzes"
ON public.chapter_quiz_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chapter_quizzes q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = chapter_quiz_questions.quiz_id
      AND q.is_published = true
      AND c.is_published = true
  )
);

REVOKE SELECT (correct_index, explanation)
  ON public.chapter_quiz_questions FROM anon, authenticated;

-- 3) centre_online_lessons: stop exposing paid video URLs to anonymous visitors.
--    Anonymous/general authenticated users only get rows flagged as free previews;
--    centre staff/admins keep full access via their existing ALL policy.
DROP POLICY IF EXISTS "Anyone view published centre lessons" ON public.centre_online_lessons;
CREATE POLICY "View free preview centre lessons"
ON public.centre_online_lessons
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND is_free_preview = true
  AND EXISTS (
    SELECT 1
    FROM public.centre_online_chapters ch
    JOIN public.centre_online_courses c ON c.id = ch.centre_course_id
    WHERE ch.id = centre_online_lessons.centre_chapter_id
      AND ch.is_published = true
      AND c.is_published = true
  )
);
