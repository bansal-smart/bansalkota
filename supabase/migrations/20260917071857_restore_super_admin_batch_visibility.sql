-- Super Admins manage the complete batch catalogue, including inactive,
-- disabled, and centre-specific batches.  Keep this separate from the
-- public/centre visibility policy so a future change to that policy cannot
-- accidentally make the management page look empty.
DROP POLICY IF EXISTS "Super admins can view all batches" ON public.course_batches;

CREATE POLICY "Super admins can view all batches"
  ON public.course_batches
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  );
