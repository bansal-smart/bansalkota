-- Same class of bug as test_attempts: centre admins got "Not authorized" on
-- Quick Resume / Re-allow because admin_reopen_attempt only checked
-- is_admin_or_super. Extend it to also allow centre staff with test_platform
-- edit permission at the attempting student's centre.
create or replace function public.admin_reopen_attempt(_attempt_id uuid, _extra_minutes integer, _fresh boolean, _reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    user_id, test_id, attempt_id, reason, status, decided_by, decided_at
  ) VALUES (
    v_attempt.user_id, v_attempt.test_id, v_new_id,
    COALESCE(_reason, 'Admin reopen'), 'approved', auth.uid(), now()
  );

  RETURN jsonb_build_object('attempt_id', v_new_id, 'extra_minutes', _extra_minutes, 'fresh', _fresh);
END;
$function$;

-- test_reattempt_requests had the identical gap: only admin/super_admin could
-- read or decide requests, so a centre admin's "pending re-attempt requests"
-- panel silently showed nothing and Approve/Reject would fail.
create policy "Centre staff view reattempt requests of their students"
on public.test_reattempt_requests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = test_reattempt_requests.user_id
      and p.centre_id is not null
      and public.has_permission(auth.uid(), 'test_platform', 'view', p.centre_id)
  )
);

create policy "Centre staff decide reattempt requests of their students"
on public.test_reattempt_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = test_reattempt_requests.user_id
      and p.centre_id is not null
      and public.has_permission(auth.uid(), 'test_platform', 'edit', p.centre_id)
  )
);
