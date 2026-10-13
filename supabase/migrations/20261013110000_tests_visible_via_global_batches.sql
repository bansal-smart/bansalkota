-- A test assigned to any batch a centre can see (a Global batch, or a
-- centre-specific batch listing that centre) is visible to that centre's staff,
-- read-only. Editing stays limited to tests the centre owns.
DROP POLICY IF EXISTS "Centre staff view tests via visible batches" ON public.tests;
CREATE POLICY "Centre staff view tests via visible batches"
ON public.tests
FOR SELECT
TO authenticated
USING (
  public.is_any_centre_staff(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.course_batches b
    WHERE b.id = ANY (tests.cbt_allowed_batch_ids)
      AND (
        b.visibility = 'global'
        OR (
          b.visibility = 'centre_specific'
          AND EXISTS (
            SELECT 1
            FROM public.batch_centre_visibility v
            JOIN public.centre_staff cs ON cs.centre_id = v.centre_id
            WHERE v.batch_id = b.id AND cs.user_id = auth.uid()
          )
        )
      )
  )
);
