-- The Eye ("View result") button in the admin Attempts tab opened
-- /tests/:slug/result/:attemptId, which loads via get_test_result_bundle().
-- That RPC only authorized admin/super_admin/teacher or the attempt's own
-- student — a centre admin got "Not authorized", the RPC threw, and
-- TestResultPage silently rendered blank. Same class of gap as test_attempts/
-- test_reattempt_requests: extend to centre staff with test_platform view
-- permission over the student's centre.
create or replace function public.get_test_result_bundle(_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_subjects jsonb;
  v_rank jsonb;
  v_student_centre uuid;
  v_authorized boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  v_authorized := v_attempt.user_id = auth.uid()
    OR public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role);
  IF NOT v_authorized THEN
    SELECT centre_id INTO v_student_centre FROM public.profiles WHERE user_id = v_attempt.user_id;
    IF v_student_centre IS NOT NULL THEN
      v_authorized := public.has_permission(auth.uid(), 'test_platform', 'view', v_student_centre);
    END IF;
  END IF;
  IF NOT v_authorized THEN
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
      'user_id', v_attempt.user_id,
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
