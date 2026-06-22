
CREATE OR REPLACE FUNCTION public.get_own_profile_lock_fields()
RETURNS TABLE(centre_id uuid, school_id uuid, batch_id uuid, roll_number text, is_bansal_offline_student boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT centre_id, school_id, batch_id, roll_number, is_bansal_offline_student
  FROM public.profiles WHERE user_id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (centre_id IS DISTINCT FROM (SELECT f.centre_id FROM public.get_own_profile_lock_fields() f))
  AND NOT (school_id IS DISTINCT FROM (SELECT f.school_id FROM public.get_own_profile_lock_fields() f))
  AND NOT (batch_id IS DISTINCT FROM (SELECT f.batch_id FROM public.get_own_profile_lock_fields() f))
  AND NOT (roll_number IS DISTINCT FROM (SELECT f.roll_number FROM public.get_own_profile_lock_fields() f))
  AND NOT (is_bansal_offline_student IS DISTINCT FROM (SELECT f.is_bansal_offline_student FROM public.get_own_profile_lock_fields() f))
);
