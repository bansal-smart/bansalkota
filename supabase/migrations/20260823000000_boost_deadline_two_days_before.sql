ALTER TABLE public.boost_settings ALTER COLUMN apply_deadline_days_before SET DEFAULT 2;

UPDATE public.boost_settings
SET apply_deadline_days_before = 2
WHERE id = 'a0000000-0000-0000-0000-0000000b0057'
  AND apply_deadline_days_before = 1;
