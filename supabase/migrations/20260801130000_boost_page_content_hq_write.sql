-- Scope BOOST page-content writes to the KOTA HQ centre admin (plus super_admin
-- as a top-level override). The generic admin tier no longer edits this page.

-- True when the user is an UNRESTRICTED admin (no delegated custom role) of the
-- HQ centre. Mirrors is_centre_admin_of() but scoped to centres.is_hq = true.
CREATE OR REPLACE FUNCTION public.is_hq_centre_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.centre_staff cs
    JOIN public.centres c ON c.id = cs.centre_id
    WHERE cs.user_id = _user_id
      AND c.is_hq = true
      AND NOT EXISTS (SELECT 1 FROM public.role_assignments ra WHERE ra.user_id = cs.user_id)
  );
$$;

DROP POLICY IF EXISTS "boost_page_content admin write" ON public.boost_page_content;

CREATE POLICY "boost_page_content hq write" ON public.boost_page_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.is_hq_centre_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.is_hq_centre_admin(auth.uid()));
