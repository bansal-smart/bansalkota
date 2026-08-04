-- get_test_rank is called from within get_test_result_bundle (just extended
-- for centre staff) but had the same narrower authorization check itself, so
-- the outer call would still raise "Not authorized" for a centre admin. Same
-- extension: centre staff with test_platform view permission over the
-- student's centre may also fetch rank/percentile info for that attempt.
create or replace function public.get_test_rank(_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_released boolean;
  v_excluded boolean;
  v_cache RECORD;
  v_compare_score numeric;
  v_self jsonb;
  v_student_centre uuid;
  v_authorized boolean;
BEGIN
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;

  v_authorized := v_attempt.user_id = auth.uid()
    OR public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(),'teacher'::app_role);
  IF NOT v_authorized THEN
    SELECT centre_id INTO v_student_centre FROM public.profiles WHERE user_id = v_attempt.user_id;
    IF v_student_centre IS NOT NULL THEN
      v_authorized := public.has_permission(auth.uid(), 'test_platform', 'view', v_student_centre);
    END IF;
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.test_result_exclusions
    WHERE test_id = v_attempt.test_id AND user_id = v_attempt.user_id
  ) INTO v_excluded;

  SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;
  v_released := public.test_results_released(v_attempt.test_id);

  IF v_excluded THEN
    RETURN jsonb_build_object('excluded', true, 'released', v_released, 'your_score', v_attempt.score);
  END IF;

  IF NOT v_released THEN
    RETURN jsonb_build_object('released', false, 'release_at', v_test.ends_at, 'your_score', v_attempt.score);
  END IF;

  SELECT * INTO v_cache FROM public.test_leaderboard_cache WHERE test_id = v_attempt.test_id;
  IF v_cache IS NULL OR v_cache.computed_at < now() - interval '30 seconds' THEN
    PERFORM public.refresh_test_leaderboard(v_attempt.test_id);
    SELECT * INTO v_cache FROM public.test_leaderboard_cache WHERE test_id = v_attempt.test_id;
  END IF;

  SELECT r INTO v_self
  FROM jsonb_array_elements(COALESCE(v_cache.ranks, '[]'::jsonb)) r
  WHERE (r->>'user_id')::uuid = v_attempt.user_id
  LIMIT 1;

  v_compare_score := COALESCE((v_self->>'score')::numeric, v_attempt.score);

  RETURN jsonb_build_object(
    'released', true,
    'excluded', false,
    'rank', COALESCE((v_self->>'rank')::int, NULL),
    'total', COALESCE(v_cache.total_attempts, 0),
    'percentile', COALESCE((v_self->>'percentile')::numeric, NULL),
    'your_score', v_compare_score,
    'topper_score', v_cache.topper_score,
    'average_score', ROUND(COALESCE(v_cache.average_score, 0)::numeric, 2)
  );
END;
$function$;
