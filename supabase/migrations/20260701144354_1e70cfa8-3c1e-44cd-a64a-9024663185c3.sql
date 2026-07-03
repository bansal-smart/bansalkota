
CREATE OR REPLACE FUNCTION public.get_test_rank(_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_released boolean;
  v_excluded boolean;
  v_cache RECORD;
  v_compare_score numeric;
  v_self jsonb;
BEGIN
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF v_attempt.user_id <> auth.uid()
     AND NOT public.is_admin_or_super(auth.uid())
     AND NOT public.has_role(auth.uid(),'teacher'::app_role) THEN
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

CREATE OR REPLACE FUNCTION public.get_test_result_bundle(_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_subjects jsonb;
  v_rank jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.user_id <> auth.uid()
     AND NOT public.is_admin_or_super(auth.uid())
     AND NOT public.has_role(auth.uid(), 'teacher'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id, title, ends_at, auto_release, results_released_at, total_marks
  INTO v_test
  FROM public.tests
  WHERE id = v_attempt.test_id;

  SELECT COALESCE(jsonb_object_agg(subj, jsonb_build_object('total', total, 'max_score', max_score)), '{}'::jsonb)
  INTO v_subjects
  FROM (
    SELECT COALESCE(NULLIF(trim(q.subject), ''), 'General') AS subj,
           count(*) AS total,
           SUM(COALESCE(q.marks_correct, 4)) AS max_score
    FROM public.test_questions q
    WHERE q.test_id = v_attempt.test_id
    GROUP BY 1
  ) s;

  v_rank := public.get_test_rank(_attempt_id);

  RETURN jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', v_attempt.id,
      'test_id', v_attempt.test_id,
      'test_name', v_attempt.test_name,
      'score', v_attempt.score,
      'total_questions', v_attempt.total_questions,
      'correct_answers', v_attempt.correct_answers,
      'percentile', v_attempt.percentile,
      'time_spent_seconds', v_attempt.time_spent_seconds,
      'metadata', v_attempt.metadata,
      'status', v_attempt.status,
      'submitted_at', v_attempt.submitted_at,
      'answers', v_attempt.answers
    ),
    'test', CASE WHEN v_test IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_test.id,
      'title', v_test.title,
      'ends_at', v_test.ends_at,
      'auto_release', v_test.auto_release,
      'results_released_at', v_test.results_released_at,
      'total_marks', v_test.total_marks
    ) END,
    'subjects_max', v_subjects,
    'rank', v_rank
  );
END;
$function$;
