
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_import_batches TO authenticated;
GRANT ALL ON public.question_import_batches TO service_role;
