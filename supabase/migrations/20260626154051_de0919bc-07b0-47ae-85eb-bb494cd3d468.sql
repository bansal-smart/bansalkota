
CREATE OR REPLACE FUNCTION public.is_centre_staff_for_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.centre_staff cs ON cs.centre_id = p.centre_id
    WHERE p.user_id = _student_id
      AND cs.user_id = _user_id
  );
$$;

CREATE POLICY "Centre staff can view enrollments for their students"
ON public.enrollments
FOR SELECT
USING (public.is_centre_staff_for_student(auth.uid(), user_id));

CREATE POLICY "Centre staff can update enrollments for their students"
ON public.enrollments
FOR UPDATE
USING (public.is_centre_staff_for_student(auth.uid(), user_id))
WITH CHECK (public.is_centre_staff_for_student(auth.uid(), user_id));
