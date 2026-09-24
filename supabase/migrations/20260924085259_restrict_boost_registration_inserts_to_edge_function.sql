-- Anonymous registrations are created only by the Edge Function, which
-- validates the payload and performs duplicate detection before inserting.
DROP POLICY IF EXISTS "Anyone can submit boost registration" ON public.boost_registrations;

REVOKE INSERT ON public.boost_registrations FROM anon, authenticated;
