-- Centre-scope BOOST registrations: a student picks a preferred centre when
-- submitting the BOOST exam form (preferred_centre_id), but until now only
-- admin/super_admin could see any of it. Let that centre's staff view + work
-- their own leads (contact the student, update payment/status/notes), same
-- has_permission(..., centre_id) pattern already used for enquiries /
-- centre_support in 20260707025201_fix_has_permission_centre_scoping.sql.

CREATE POLICY "Centre staff view their centre boost registrations"
ON public.boost_registrations FOR SELECT TO authenticated
USING (
  preferred_centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'boost', 'view', preferred_centre_id)
);

CREATE POLICY "Centre staff update their centre boost registrations"
ON public.boost_registrations FOR UPDATE TO authenticated
USING (
  preferred_centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'boost', 'edit', preferred_centre_id)
)
WITH CHECK (
  preferred_centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'boost', 'edit', preferred_centre_id)
);
