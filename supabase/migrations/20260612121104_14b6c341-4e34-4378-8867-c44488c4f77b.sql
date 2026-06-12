
-- 1. Hide correct_answer / explanation / numerical_answer from students via RLS column-level approach.
-- Replace broad SELECT policy on test_questions with one that hides answer columns for non-staff.
DROP POLICY IF EXISTS "View questions of accessible tests" ON public.test_questions;

-- Authenticated users (students) can read questions of accessible tests, but only via
-- a view/RPC that strips answer columns. We block direct SELECT of answer columns by
-- restricting access at column-grant level.
CREATE POLICY "View questions of accessible tests"
ON public.test_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND (t.is_published = true OR t.created_by = auth.uid()
           OR has_role(auth.uid(),'admin'::app_role)
           OR has_role(auth.uid(),'super_admin'::app_role)
           OR has_role(auth.uid(),'teacher'::app_role))
  )
);

-- Revoke broad column access, then grant only the safe columns to authenticated.
REVOKE SELECT ON public.test_questions FROM authenticated;
GRANT SELECT (
  id, test_id, position, subject, topic, question_text, question_image_url,
  question_type, options, difficulty, marks_correct, marks_wrong,
  marks_unanswered, partial_marking, tolerance, answer_format, option_images,
  sub_topic, created_at, import_batch_id, source_filename, solution_image_url
) ON public.test_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;

-- 2. Restrict course_resources to authenticated users only.
DROP POLICY IF EXISTS "Public can view published resource metadata" ON public.course_resources;
CREATE POLICY "Authenticated can view published resource metadata"
ON public.course_resources FOR SELECT
TO authenticated
USING (
  is_published = true
);
REVOKE SELECT ON public.course_resources FROM anon;

-- 3. Restrict course_pdfs similarly.
DROP POLICY IF EXISTS "View pdfs of published courses" ON public.course_pdfs;
CREATE POLICY "Auth users view pdfs of published courses"
ON public.course_pdfs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_pdfs.course_id AND c.is_published = true)
);
REVOKE SELECT ON public.course_pdfs FROM anon;

-- 4. Lock down realtime.messages — only allow subscriptions to topics the user owns.
-- Enable RLS and add a default-deny + user-scoped policy.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can subscribe to their own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to their own topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Allow topics that start with the user's own UUID, e.g. "user:<uid>:notifications"
  (realtime.topic() LIKE auth.uid()::text || ':%')
  OR (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
);
