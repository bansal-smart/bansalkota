-- 1. Reset attempt history
TRUNCATE TABLE public.test_attempts RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.test_reattempt_requests RESTART IDENTITY CASCADE;

-- 2. Override columns for admin-reopened attempts
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS time_override_minutes int,
  ADD COLUMN IF NOT EXISTS time_override_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_reason text;

-- 3. Admin reopen RPC
CREATE OR REPLACE FUNCTION public.admin_reopen_attempt(
  _attempt_id uuid,
  _extra_minutes int,
  _fresh boolean,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _extra_minutes IS NULL OR _extra_minutes < 1 OR _extra_minutes > 600 THEN
    RAISE EXCEPTION 'extra_minutes must be 1..600';
  END IF;

  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  IF _fresh THEN
    DELETE FROM public.test_attempts WHERE id = _attempt_id;
    INSERT INTO public.test_attempts (
      user_id, test_id, status, started_at, answers,
      time_override_minutes, time_override_started_at, reopened_by, reopened_reason
    ) VALUES (
      v_attempt.user_id, v_attempt.test_id, 'in_progress', now(), '{}'::jsonb,
      _extra_minutes, now(), auth.uid(), _reason
    ) RETURNING id INTO v_new_id;
  ELSE
    UPDATE public.test_attempts
    SET status = 'in_progress',
        score = NULL,
        correct_answers = NULL,
        percentile = NULL,
        submitted_at = NULL,
        started_at = now(),
        time_override_minutes = _extra_minutes,
        time_override_started_at = now(),
        reopened_by = auth.uid(),
        reopened_reason = _reason
    WHERE id = _attempt_id;
    v_new_id := _attempt_id;
  END IF;

  INSERT INTO public.test_reattempt_requests (
    user_id, test_id, attempt_id, reason, status, decided_by, decided_at
  ) VALUES (
    v_attempt.user_id, v_attempt.test_id, v_new_id,
    COALESCE(_reason, 'Admin reopen'), 'approved', auth.uid(), now()
  );

  RETURN jsonb_build_object('attempt_id', v_new_id, 'extra_minutes', _extra_minutes, 'fresh', _fresh);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reopen_attempt(uuid, int, boolean, text) TO authenticated;