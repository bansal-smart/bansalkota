-- Hide answer key from clients by granting SELECT only on non-answer columns.
REVOKE SELECT ON public.chapter_quiz_questions FROM anon, authenticated;

GRANT SELECT (id, quiz_id, position, question, options, created_at)
  ON public.chapter_quiz_questions TO anon, authenticated;

-- Admins/teachers continue to read answers via the existing get_chapter_quiz_answers RPC
-- and via service_role on the server. Keep write grants intact for admin tooling.
GRANT INSERT, UPDATE, DELETE ON public.chapter_quiz_questions TO authenticated;
GRANT ALL ON public.chapter_quiz_questions TO service_role;