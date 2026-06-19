
CREATE POLICY "Centre staff can update their students"
ON public.profiles
FOR UPDATE
USING (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id))
WITH CHECK (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id));
