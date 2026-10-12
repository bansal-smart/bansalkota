-- Kota is the only HQ; Pune Swargate was flagged HQ by mistake.
UPDATE public.centres SET is_hq = false WHERE slug = 'pune-swargate';

-- The three national test series (BAITS JEE/NEET, SEHSS) must be visible to every centre.
UPDATE public.test_series SET is_global = true
WHERE title IN (
  'SEHSS TEST SERIES - 2027 (For Class VIII, IX & X)',
  'BANSAL ALL INDIA TEST SERIES (BAITS) - JEE (Main) 2027',
  'BANSAL ALL INDIA TEST SERIES (BAITS) - NEET 2027'
);

-- Global is now signalled by is_global (every row has an owning centre_id), so
-- centre staff must be able to read global series including unpublished ones.
DROP POLICY IF EXISTS "Centre staff view global test series" ON public.test_series;
CREATE POLICY "Centre staff view global test series"
ON public.test_series
FOR SELECT
TO authenticated
USING (
  (is_global = true OR centre_id IS NULL)
  AND public.is_any_centre_staff(auth.uid())
);
