
-- 1. Remove live_classes from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.live_classes;

-- 2. Revoke direct column access on sensitive live_classes columns
REVOKE SELECT (meeting_url, recording_url) ON public.live_classes FROM authenticated, anon;

-- 3. Revoke direct column access on sensitive question_bank answer columns
REVOKE SELECT (correct_answer, numerical_answer, explanation, solution_image_url) ON public.question_bank FROM authenticated, anon;
