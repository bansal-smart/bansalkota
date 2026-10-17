-- Admin form used to save target_exam = 'IIT-JEE', but the catalogue filters on
-- 'JEE (Main)' / 'JEE Advanced'. Re-label existing rows by title.
UPDATE public.test_series
SET target_exam = CASE
  WHEN title ILIKE '%advanced%' THEN 'JEE Advanced'
  ELSE 'JEE (Main)'
END
WHERE target_exam = 'IIT-JEE';
