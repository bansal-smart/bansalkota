GRANT INSERT ON public.boost_registrations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.boost_registrations TO authenticated;
GRANT ALL ON public.boost_registrations TO service_role;