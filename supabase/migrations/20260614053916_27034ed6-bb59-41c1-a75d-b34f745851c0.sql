DROP POLICY IF EXISTS "Only service role can access answer snapshots" ON public.test_attempt_answer_snapshots;

REVOKE ALL ON public.test_attempt_answer_snapshots FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_test_attempt_answers() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._jsonb_answer_has_selection(jsonb) FROM PUBLIC, anon, authenticated;