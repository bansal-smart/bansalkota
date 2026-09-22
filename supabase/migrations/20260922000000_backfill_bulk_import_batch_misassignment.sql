-- 362 students bulk-imported between 2026-09-04 and 2026-09-19 across 11
-- centres were silently assigned batch_id = the test-series-only batch
-- (NEET-TS / JEE-TS, linked to the "AITS NEET"/"AITS JEE" test-series-only
-- products) instead of their real classroom PAN-India batch, because their
-- uploaded rosters' Batch Code column literally contained "NEET-TS"/"JEE-TS".
-- The import code (correctly) resolved that value to a real batch, but it
-- meant their only course enrollment became the test series rather than
-- their actual classroom course. See supabase/functions/bulk-import/index.ts
-- for the accompanying fix that stops a test-series-only batch from being
-- resolvable via the CSV Batch Code column going forward.
--
-- This moves batch_id to the correct PAN-India batch — derived the same way
-- the import itself derives it, from the student's own stream + class — and
-- adds the missing classroom-course enrollment. The existing AITS test-series
-- enrollment is left in place; it's a real, valid enrollment, just not their
-- only one.
WITH affected AS (
  SELECT p.id AS profile_id, p.user_id,
    CASE
      WHEN p.target_exam = 'NEET' AND p.class_level IN ('Class 12', 'XII', '12') THEN 'M-XII'
      WHEN p.target_exam = 'NEET' AND p.class_level = 'Dropper' THEN 'M-XIII'
      WHEN p.target_exam = 'JEE' AND p.class_level IN ('Class 12', 'XII') THEN 'J-XII'
    END AS new_code
  FROM public.profiles p
  JOIN public.course_batches cb ON cb.id = p.batch_id
  WHERE cb.code IN ('NEET-TS', 'JEE-TS')
),
new_batches AS (
  SELECT id, code, course_id FROM public.course_batches WHERE code IN ('M-XII', 'M-XIII', 'J-XII')
),
updated AS (
  UPDATE public.profiles p
  SET batch_id = nb.id, batch_label = nb.code
  FROM affected a
  JOIN new_batches nb ON nb.code = a.new_code
  WHERE p.id = a.profile_id AND a.new_code IS NOT NULL
  RETURNING a.user_id, nb.course_id
)
INSERT INTO public.enrollments (user_id, course_id, is_active)
SELECT DISTINCT user_id, course_id, true FROM updated
ON CONFLICT (user_id, course_id) DO UPDATE SET is_active = true;
