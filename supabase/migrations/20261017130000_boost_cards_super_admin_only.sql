-- BOOST card settings (dates, price, deadline) and page content are editable by
-- super_admin only. Public read policies are unchanged.
DROP POLICY IF EXISTS "boost_settings admin write" ON public.boost_settings;
CREATE POLICY "boost_settings super admin write" ON public.boost_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "boost_page_content hq write" ON public.boost_page_content;
CREATE POLICY "boost_page_content super admin write" ON public.boost_page_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
