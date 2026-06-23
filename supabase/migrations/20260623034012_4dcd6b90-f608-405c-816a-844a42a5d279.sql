
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS force_submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS force_submitted_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_force_submit_pending(_test_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int := 0;
  _att record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR _att IN
    SELECT id FROM public.test_attempts
    WHERE test_id = _test_id AND status = 'in_progress'
  LOOP
    UPDATE public.test_attempts
       SET status = 'submitted',
           submitted_at = COALESCE(submitted_at, now()),
           force_submitted_by = auth.uid(),
           force_submitted_at = now()
     WHERE id = _att.id;

    PERFORM public.score_test_attempt(_att.id);
    _count := _count + 1;
  END LOOP;

  IF _count > 0 THEN
    PERFORM public.refresh_test_leaderboard(_test_id);
  END IF;

  RETURN jsonb_build_object('submitted_count', _count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_submit_pending(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_force_submit_pending(uuid) TO authenticated;
