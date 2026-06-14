ALTER TABLE public.test_attempts ALTER COLUMN score DROP NOT NULL;
ALTER TABLE public.test_attempts ALTER COLUMN correct_answers DROP NOT NULL;
ALTER TABLE public.test_attempts ALTER COLUMN total_questions DROP NOT NULL;