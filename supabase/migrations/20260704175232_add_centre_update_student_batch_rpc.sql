-- Centre staff need to reassign a student's batch within their own centre, but
-- profiles.batch_id is a locked field under the "Centre staff can update their
-- students" RLS policy (added to stop centre_id/batch_id/roll_number etc. being
-- changed via a raw client update). This RPC provides the one legitimate,
-- narrowly-scoped path to change batch_id: it runs as SECURITY DEFINER, verifies
-- the caller is centre staff (or admin) for the student's centre, and verifies
-- the target batch belongs to that same centre before applying the update.
CREATE OR REPLACE FUNCTION public.centre_update_student_batch(_user_id uuid, _batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _centre_id uuid;
  _batch_centre_id uuid;
BEGIN
  SELECT centre_id INTO _centre_id FROM public.profiles WHERE user_id = _user_id;
  IF _centre_id IS NULL THEN
    RAISE EXCEPTION 'Student is not mapped to a centre';
  END IF;

  IF NOT public.is_centre_staff(auth.uid(), _centre_id) AND NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized for this centre';
  END IF;

  IF _batch_id IS NOT NULL THEN
    SELECT centre_id INTO _batch_centre_id FROM public.course_batches WHERE id = _batch_id;
    IF _batch_centre_id IS DISTINCT FROM _centre_id THEN
      RAISE EXCEPTION 'Batch does not belong to this centre';
    END IF;
  END IF;

  UPDATE public.profiles SET batch_id = _batch_id WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.centre_update_student_batch(uuid, uuid) TO authenticated;
