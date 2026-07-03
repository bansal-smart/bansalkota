REVOKE SELECT ON public.profiles FROM anon;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.test_attempts FROM anon;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.test_attempt_answer_snapshots FROM anon;
ALTER TABLE public.test_attempt_answer_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.question_import_batches FROM anon;
ALTER TABLE public.question_import_batches ENABLE ROW LEVEL SECURITY;