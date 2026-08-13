-- Centralize on PAN-India batches (JEPAN-XI/XII/XIII, MEPAN-XI/XII/XIII —
-- course_batches with centre_id IS NULL, course_id set) instead of the
-- auto-created per-centre placeholder batches (XI-J, XII-J, XIII-J, XI-N,
-- XII-N, XIII-N — course_id IS NULL, one set per franchise centre). Those
-- placeholders were created by create_standard_batches() for every new
-- franchise centre and are functionally the same cohort as their PAN-India
-- equivalent, just duplicated per centre. Kota HQ's own real, course-linked
-- batches (XI-J1, XII-A2, XIII-V2, etc.) are a completely different set and
-- are untouched by this migration.

-- 1. Move any student currently sitting in a placeholder batch to the
--    matching PAN-India batch, by code.
WITH code_map(old_code, pan_code) AS (
  VALUES ('XI-J', 'J-XI'), ('XII-J', 'J-XII'), ('XIII-J', 'J-XIII'),
         ('XI-N', 'M-XI'), ('XII-N', 'M-XII'), ('XIII-N', 'M-XIII')
),
pan_ids AS (
  SELECT cb.code, cb.id
  FROM public.course_batches cb
  WHERE cb.centre_id IS NULL
    AND cb.course_id IS NOT NULL
    AND cb.code IN ('J-XI', 'J-XII', 'J-XIII', 'M-XI', 'M-XII', 'M-XIII')
)
UPDATE public.profiles p
SET batch_id = pan_ids.id
FROM public.course_batches old_b
JOIN code_map ON code_map.old_code = old_b.code
JOIN pan_ids ON pan_ids.code = code_map.pan_code
WHERE p.batch_id = old_b.id
  AND old_b.centre_id IS NOT NULL
  AND old_b.course_id IS NULL;

-- 2. Delete the placeholder batches (centre-scoped, course-less, standard
--    code) and any orphaned duplicates of the same shape that carry neither a
--    centre nor a course. True PAN-India batches always have course_id set,
--    so they're never matched here.
DELETE FROM public.course_batches
WHERE course_id IS NULL
  AND code IN ('XI-J', 'XII-J', 'XIII-J', 'XI-N', 'XII-N', 'XIII-N');

-- 3. Stop auto-creating per-centre placeholder batches for new franchise
--    centres. The trigger (trg_centre_create_batches, unchanged) still fires
--    on centre creation and calls this function; it's now a no-op so new
--    centres simply rely on the existing global PAN-India batches.
CREATE OR REPLACE FUNCTION public.create_standard_batches(_centre_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- No-op: batches are centralized on PAN-India batches (course_batches with
  -- centre_id IS NULL) instead of per-centre placeholders.
END;
$function$;
