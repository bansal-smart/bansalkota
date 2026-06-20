-- Prevent students from self-assigning to a centre/school/batch via their own profile update,
-- which would otherwise expose their PII to that centre's staff.

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND centre_id IS NOT DISTINCT FROM (SELECT p.centre_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND school_id IS NOT DISTINCT FROM (SELECT p.school_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND batch_id  IS NOT DISTINCT FROM (SELECT p.batch_id  FROM public.profiles p WHERE p.user_id = auth.uid())
  AND roll_number IS NOT DISTINCT FROM (SELECT p.roll_number FROM public.profiles p WHERE p.user_id = auth.uid())
  AND is_bansal_offline_student IS NOT DISTINCT FROM (SELECT p.is_bansal_offline_student FROM public.profiles p WHERE p.user_id = auth.uid())
);