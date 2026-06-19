-- 1) Delta autosave RPC
CREATE OR REPLACE FUNCTION public.save_test_attempt_delta(
  _attempt_id uuid,
  _answer_changes jsonb DEFAULT '{}'::jsonb,
  _status_changes jsonb DEFAULT '{}'::jsonb,
  _clear_ids text[] DEFAULT ARRAY[]::text[],
  _tab_switches integer DEFAULT NULL,
  _time_spent integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_new_answers jsonb;
  v_new_statuses jsonb;
  v_new_metadata jsonb;
  k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_attempt.status NOT IN ('in_progress') THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_in_progress');
  END IF;

  v_new_answers := COALESCE(v_attempt.answers, '{}'::jsonb);
  v_new_statuses := COALESCE(v_attempt.question_statuses, '{}'::jsonb);

  -- Apply explicit clears first so a re-set within the same call wins.
  IF _clear_ids IS NOT NULL THEN
    FOREACH k IN ARRAY _clear_ids LOOP
      v_new_answers := v_new_answers - k;
      v_new_statuses := v_new_statuses - k;
    END LOOP;
  END IF;

  -- Merge incoming answer changes
  IF _answer_changes IS NOT NULL AND _answer_changes <> '{}'::jsonb THEN
    v_new_answers := v_new_answers || _answer_changes;
  END IF;

  -- Merge incoming status changes
  IF _status_changes IS NOT NULL AND _status_changes <> '{}'::jsonb THEN
    v_new_statuses := v_new_statuses || _status_changes;
  END IF;

  v_new_metadata := COALESCE(v_attempt.metadata, '{}'::jsonb);
  IF _tab_switches IS NOT NULL THEN
    v_new_metadata := jsonb_set(v_new_metadata, ARRAY['tab_switches'], to_jsonb(_tab_switches), true);
  END IF;
  IF _clear_ids IS NOT NULL AND array_length(_clear_ids, 1) > 0 THEN
    v_new_metadata := jsonb_set(v_new_metadata, ARRAY['explicit_clear_ids'], to_jsonb(_clear_ids), true);
  END IF;

  UPDATE public.test_attempts
  SET answers = v_new_answers,
      question_statuses = v_new_statuses,
      metadata = v_new_metadata,
      time_spent_seconds = COALESCE(_time_spent, time_spent_seconds)
  WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'ok', true,
    'answer_count', (SELECT count(*) FROM jsonb_object_keys(v_new_answers))
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_test_attempt_delta(uuid, jsonb, jsonb, text[], integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_test_attempt_delta(uuid, jsonb, jsonb, text[], integer, integer) TO authenticated;

-- 2) Single-call result bundle
CREATE OR REPLACE FUNCTION public.get_test_result_bundle(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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

  -- per-subject totals (count of questions + sum of marks_correct)
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

  -- Reuse the existing rank function (handles release-gating + exclusions)
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
      'submitted_at', v_attempt.submitted_at
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_test_result_bundle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_test_result_bundle(uuid) TO authenticated;

-- 3) Index to accelerate admin_test_result_sheet + rank scans
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_status_user_submitted
ON public.test_attempts (test_id, status, user_id, submitted_at DESC);