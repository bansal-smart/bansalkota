-- "Authenticated can view published tests" granted SELECT on every published
-- test to every logged-in user, so a franchise centre admin (e.g. Wanwadi)
-- could read Kota's centre-specific tests. Centre staff now only see global
-- tests (is_global / legacy NULL centre_id) and their own centre's tests.
-- Students and non-centre admins keep the existing published-test visibility
-- (student eligibility is enforced separately via cbt_allowed_batch_ids).
DROP POLICY IF EXISTS "Authenticated can view published tests" ON public.tests;
CREATE POLICY "Authenticated can view published tests"
ON public.tests
FOR SELECT
TO authenticated
USING (
  (
    is_published = true
    AND (
      NOT public.is_any_centre_staff(auth.uid())
      OR public.is_admin_or_super(auth.uid())
      OR is_global = true
      OR centre_id IS NULL
      OR public.is_centre_staff(auth.uid(), centre_id)
    )
  )
  OR created_by = auth.uid()
  OR (centre_id IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
);

-- Audit helper (run manually): accounts staffed at more than one centre.
-- SELECT user_id, array_agg(centre_id) FROM public.centre_staff
-- GROUP BY user_id HAVING count(*) > 1;
