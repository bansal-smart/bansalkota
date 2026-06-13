ALTER TABLE public.test_questions ALTER COLUMN tolerance SET DEFAULT 0;
ALTER TABLE public.test_questions ALTER COLUMN tolerance DROP NOT NULL;
UPDATE public.test_questions SET tolerance = 0 WHERE tolerance IS NULL;