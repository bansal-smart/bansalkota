ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempt_answer_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON public.test_attempts FROM anon;
REVOKE SELECT ON public.question_import_batches FROM anon;
REVOKE SELECT ON public.test_attempt_answer_snapshots FROM anon;