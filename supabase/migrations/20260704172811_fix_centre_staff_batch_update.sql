-- Allow centre staff to change a student's batch_id.
-- The "Centre staff can update their students" WITH CHECK previously locked
-- batch_id alongside centre_id/school_id, which blocked the "My Students"
-- batch reassignment feature with a row-level security violation (42501).

CREATE OR REPLACE FUNCTION public.get_profile_lock_fields(_user_id uuid)
RETURNS TABLE(centre_id uuid, school_id uuid,
              roll_number text, is_bansal_offline_student boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT centre_id, school_id, roll_number, is_bansal_offline_student
  FROM public.profiles WHERE user_id = _user_id
$$;

DROP POLICY IF EXISTS "Centre staff can update their students" ON public.profiles;
CREATE POLICY "Centre staff can update their students"
ON public.profiles FOR UPDATE
USING (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id))
WITH CHECK (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
  AND NOT (centre_id IS DISTINCT FROM (SELECT f.centre_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (school_id IS DISTINCT FROM (SELECT f.school_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (roll_number IS DISTINCT FROM (SELECT f.roll_number FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (is_bansal_offline_student IS DISTINCT FROM (SELECT f.is_bansal_offline_student FROM public.get_profile_lock_fields(profiles.user_id) f))
);
