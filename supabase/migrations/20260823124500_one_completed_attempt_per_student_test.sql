-- One completed attempt per student per test.
-- Students could previously submit, then insert a fresh in_progress row
-- (the unique index only covered in_progress). BOOST and other live exams
-- must be single-attempt until an unused approved re-attempt exists, or a
-- new test is published for the next exam date.

ALTER TABLE public.test_reattempt_requests
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_test_reattempt_requests_unused_approval
  ON public.test_reattempt_requests (user_id, test_id)
  WHERE status = 'approved' AND consumed_at IS NULL;

CREATE OR REPLACE FUNCTION public.can_reattempt_test(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.test_reattempt_requests
    WHERE user_id = _user_id
      AND test_id = _test_id
      AND status = 'approved'
      AND consumed_at IS NULL
      AND (decided_at IS NULL OR decided_at > now() - interval '30 days')
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_one_completed_attempt_per_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_id uuid;
  v_req_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'in_progress' THEN
    RETURN NEW;
  END IF;

  -- Staff reopen RPCs insert as the staff user (NEW.user_id is the student).
  -- Service-role jobs have no JWT. Only lock self-serve student inserts.
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_completed_id
  FROM public.test_attempts
  WHERE user_id = NEW.user_id
    AND test_id = NEW.test_id
    AND status IN ('submitted', 'auto_submitted')
  LIMIT 1;

  IF v_completed_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_req_id
  FROM public.test_reattempt_requests
  WHERE user_id = NEW.user_id
    AND test_id = NEW.test_id
    AND status = 'approved'
    AND consumed_at IS NULL
    AND (decided_at IS NULL OR decided_at > now() - interval '30 days')
  ORDER BY decided_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'ALREADY_ATTEMPTED: This test can only be taken once per account'
      USING ERRCODE = 'P0001',
            HINT = 'Register for the next exam date (a new test) or request an admin re-attempt.';
  END IF;

  UPDATE public.test_reattempt_requests
  SET consumed_at = now(),
      updated_at = now()
  WHERE id = v_req_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_one_completed_attempt_per_test ON public.test_attempts;
CREATE TRIGGER trg_enforce_one_completed_attempt_per_test
  BEFORE INSERT ON public.test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_completed_attempt_per_test();

-- Admin/centre reopen already creates the replacement attempt. Mark that
-- log-row consumed so it cannot be used for a second extra student insert.
CREATE OR REPLACE FUNCTION public.admin_reopen_attempt(
  _attempt_id uuid,
  _extra_minutes integer,
  _fresh boolean,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_new_id uuid;
  v_student_centre uuid;
  v_authorized boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _extra_minutes IS NULL OR _extra_minutes < 1 OR _extra_minutes > 600 THEN
    RAISE EXCEPTION 'extra_minutes must be 1..600';
  END IF;

  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  v_authorized := public.is_admin_or_super(auth.uid());
  IF NOT v_authorized THEN
    SELECT centre_id INTO v_student_centre FROM public.profiles WHERE user_id = v_attempt.user_id;
    IF v_student_centre IS NOT NULL THEN
      v_authorized := public.has_permission(auth.uid(), 'test_platform', 'edit', v_student_centre);
    END IF;
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
    user_id, test_id, attempt_id, reason, status, decided_by, decided_at, consumed_at
  ) VALUES (
    v_attempt.user_id, v_attempt.test_id, v_new_id,
    COALESCE(_reason, 'Admin reopen'), 'approved', auth.uid(), now(), now()
  );

  RETURN jsonb_build_object('attempt_id', v_new_id, 'extra_minutes', _extra_minutes, 'fresh', _fresh);
END;
$function$;
