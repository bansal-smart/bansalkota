DROP POLICY IF EXISTS "Users view own boost registration by email" ON public.boost_registrations;

CREATE POLICY "Users view own boost registration by email"
ON public.boost_registrations
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));