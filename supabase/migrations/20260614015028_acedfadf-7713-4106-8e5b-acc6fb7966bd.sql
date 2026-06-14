
-- 1. Normalize question marks: any attempted wrong = -1, unattempted = 0, correct = keep (default 4)
UPDATE public.test_questions
SET marks_wrong = -1
WHERE COALESCE(marks_wrong, 0) = 0;

UPDATE public.test_questions
SET marks_unanswered = 0
WHERE marks_unanswered IS DISTINCT FROM 0;

UPDATE public.test_questions
SET marks_correct = 4
WHERE marks_correct IS NULL;

-- 2. Replace submit_test_attempt with cleaner +4/-1/0 logic and per-question breakdown
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  attempt RECORD;
  q RECORD;
  user_ans jsonb;
  selected jsonb;
  num_val numeric;
  is_correct boolean;
  is_attempted boolean;
  q_marks numeric;
  total_score numeric := 0;
  correct_count int := 0;
  total_count int := 0;
  attempted_count int := 0;
  subject_data jsonb := '{}'::jsonb;
  per_question jsonb := '[]'::jsonb;
  subj_key text;
  pct numeric;
  lower_count int;
  total_attempts int;
  correct_arr jsonb;
  selected_arr jsonb;
  exact boolean;
  k_text text;
  pair_total int;
  pair_correct int;
  pair_correct_val text;
  pair_user_val text;
  cmp_correct jsonb;
BEGIN
  SELECT * INTO attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF attempt.user_id <> auth.uid()
     AND NOT (has_role(auth.uid(),'admin'::app_role)
              OR has_role(auth.uid(),'super_admin'::app_role)
              OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR q IN SELECT * FROM public.test_questions WHERE test_id = attempt.test_id ORDER BY position LOOP
    total_count := total_count + 1;
    user_ans := COALESCE(attempt.answers -> q.id::text, NULL);
    selected := user_ans -> 'selected';
    is_correct := false;
    is_attempted := false;
    q_marks := 0;

    IF selected IS NULL OR selected = 'null'::jsonb
       OR (jsonb_typeof(selected) = 'array' AND jsonb_array_length(selected) = 0)
       OR (jsonb_typeof(selected) = 'object' AND selected = '{}'::jsonb)
       OR (jsonb_typeof(selected) = 'string' AND length(trim(both '"' from selected::text)) = 0)
    THEN
      q_marks := 0;
    ELSE
      is_attempted := true;
      attempted_count := attempted_count + 1;

      CASE COALESCE(q.question_type, 'mcq-single')
        WHEN 'mcq-multi' THEN
          correct_arr := COALESCE(q.correct_answer, '[]'::jsonb);
          selected_arr := CASE WHEN jsonb_typeof(selected) = 'array' THEN selected ELSE jsonb_build_array(selected) END;
          exact := (correct_arr @> selected_arr) AND (selected_arr @> correct_arr);
          is_correct := exact;

        WHEN 'match-following' THEN
          correct_arr := COALESCE(q.correct_answer, '{}'::jsonb);
          pair_total := 0; pair_correct := 0;
          IF jsonb_typeof(correct_arr) = 'object' AND jsonb_typeof(selected) = 'object' THEN
            FOR k_text IN SELECT jsonb_object_keys(correct_arr) LOOP
              pair_total := pair_total + 1;
              pair_correct_val := correct_arr ->> k_text;
              pair_user_val := selected ->> k_text;
              IF pair_user_val IS NOT NULL AND pair_user_val = pair_correct_val THEN
                pair_correct := pair_correct + 1;
              END IF;
            END LOOP;
          END IF;
          is_correct := (pair_total > 0 AND pair_correct = pair_total);

        WHEN 'numerical', 'integer' THEN
          BEGIN
            num_val := (selected #>> '{}')::numeric;
          EXCEPTION WHEN OTHERS THEN
            num_val := NULL;
          END;
          IF num_val IS NOT NULL AND q.numerical_answer IS NOT NULL
             AND abs(num_val - q.numerical_answer) <= COALESCE(q.tolerance, 0) THEN
            is_correct := true;
          END IF;

        ELSE -- mcq-single, assertion-reason, default
          cmp_correct := q.correct_answer;
          -- Accept correct_answer stored as scalar OR {"value": x}
          IF jsonb_typeof(cmp_correct) = 'object' AND cmp_correct ? 'value' THEN
            cmp_correct := cmp_correct -> 'value';
          END IF;
          IF cmp_correct = selected THEN
            is_correct := true;
          ELSIF jsonb_typeof(cmp_correct) IS NOT NULL
                AND (cmp_correct #>> '{}') = (selected #>> '{}') THEN
            is_correct := true;
          END IF;
      END CASE;

      IF is_correct THEN
        q_marks := COALESCE(q.marks_correct, 4);
        correct_count := correct_count + 1;
      ELSE
        q_marks := COALESCE(NULLIF(q.marks_wrong, 0), -1);
      END IF;
    END IF;

    total_score := total_score + q_marks;

    subj_key := COALESCE(q.subject, 'General');
    subject_data := jsonb_set(
      subject_data,
      ARRAY[subj_key],
      COALESCE(subject_data -> subj_key, '{"total":0,"correct":0,"attempted":0,"score":0}'::jsonb)
        || jsonb_build_object(
          'total', COALESCE((subject_data -> subj_key ->> 'total')::int, 0) + 1,
          'correct', COALESCE((subject_data -> subj_key ->> 'correct')::int, 0) + (CASE WHEN is_correct THEN 1 ELSE 0 END),
          'attempted', COALESCE((subject_data -> subj_key ->> 'attempted')::int, 0) + (CASE WHEN is_attempted THEN 1 ELSE 0 END),
          'score', COALESCE((subject_data -> subj_key ->> 'score')::numeric, 0) + q_marks
        ),
      true
    );

    per_question := per_question || jsonb_build_array(jsonb_build_object(
      'question_id', q.id,
      'position', q.position,
      'subject', subj_key,
      'attempted', is_attempted,
      'is_correct', is_correct,
      'marks', q_marks
    ));
  END LOOP;

  SELECT COUNT(*) INTO total_attempts FROM public.test_attempts
    WHERE test_id = attempt.test_id AND status IN ('submitted','auto_submitted') AND id <> _attempt_id;
  SELECT COUNT(*) INTO lower_count FROM public.test_attempts
    WHERE test_id = attempt.test_id AND status IN ('submitted','auto_submitted')
    AND id <> _attempt_id AND score < total_score;
  pct := CASE WHEN total_attempts = 0 THEN 100 ELSE ROUND(lower_count::numeric * 100.0 / total_attempts, 1) END;

  UPDATE public.test_attempts
  SET score = total_score,
      correct_answers = correct_count,
      total_questions = total_count,
      percentile = pct,
      status = CASE WHEN status = 'in_progress' THEN 'submitted' ELSE status END,
      submitted_at = COALESCE(submitted_at, now()),
      metadata = COALESCE(metadata, '{}'::jsonb)
                  || jsonb_build_object('subjects', subject_data, 'questions', per_question)
  WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'score', total_score, 'correct', correct_count, 'total', total_count,
    'attempted', attempted_count, 'percentile', pct, 'subjects', subject_data
  );
END;
$function$;

-- 3. Backfill all submitted/auto_submitted attempts using the new logic
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.test_attempts
    WHERE status IN ('submitted','auto_submitted')
  LOOP
    BEGIN
      -- temporarily allow re-run from a non-user context by calling internal logic
      PERFORM public.submit_test_attempt(r.id);
    EXCEPTION WHEN OTHERS THEN
      -- submit_test_attempt requires auth.uid(); fall back to direct recompute
      NULL;
    END;
  END LOOP;
END $$;

-- 3b. Fallback recompute without auth check (for backfill)
CREATE OR REPLACE FUNCTION public._recompute_attempt(_attempt_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  attempt RECORD;
  q RECORD;
  selected jsonb;
  num_val numeric;
  is_correct boolean;
  is_attempted boolean;
  q_marks numeric;
  total_score numeric := 0;
  correct_count int := 0;
  total_count int := 0;
  attempted_count int := 0;
  subject_data jsonb := '{}'::jsonb;
  per_question jsonb := '[]'::jsonb;
  subj_key text;
  pct numeric;
  lower_count int;
  total_attempts int;
  correct_arr jsonb;
  selected_arr jsonb;
  exact boolean;
  k_text text;
  pair_total int;
  pair_correct int;
  pair_correct_val text;
  pair_user_val text;
  cmp_correct jsonb;
BEGIN
  SELECT * INTO attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF attempt IS NULL THEN RETURN; END IF;

  FOR q IN SELECT * FROM public.test_questions WHERE test_id = attempt.test_id ORDER BY position LOOP
    total_count := total_count + 1;
    selected := (attempt.answers -> q.id::text) -> 'selected';
    is_correct := false;
    is_attempted := false;
    q_marks := 0;

    IF selected IS NULL OR selected = 'null'::jsonb
       OR (jsonb_typeof(selected) = 'array' AND jsonb_array_length(selected) = 0)
       OR (jsonb_typeof(selected) = 'object' AND selected = '{}'::jsonb)
       OR (jsonb_typeof(selected) = 'string' AND length(trim(both '"' from selected::text)) = 0)
    THEN
      q_marks := 0;
    ELSE
      is_attempted := true;
      attempted_count := attempted_count + 1;

      CASE COALESCE(q.question_type, 'mcq-single')
        WHEN 'mcq-multi' THEN
          correct_arr := COALESCE(q.correct_answer, '[]'::jsonb);
          selected_arr := CASE WHEN jsonb_typeof(selected) = 'array' THEN selected ELSE jsonb_build_array(selected) END;
          exact := (correct_arr @> selected_arr) AND (selected_arr @> correct_arr);
          is_correct := exact;
        WHEN 'match-following' THEN
          correct_arr := COALESCE(q.correct_answer, '{}'::jsonb);
          pair_total := 0; pair_correct := 0;
          IF jsonb_typeof(correct_arr) = 'object' AND jsonb_typeof(selected) = 'object' THEN
            FOR k_text IN SELECT jsonb_object_keys(correct_arr) LOOP
              pair_total := pair_total + 1;
              pair_correct_val := correct_arr ->> k_text;
              pair_user_val := selected ->> k_text;
              IF pair_user_val IS NOT NULL AND pair_user_val = pair_correct_val THEN
                pair_correct := pair_correct + 1;
              END IF;
            END LOOP;
          END IF;
          is_correct := (pair_total > 0 AND pair_correct = pair_total);
        WHEN 'numerical', 'integer' THEN
          BEGIN
            num_val := (selected #>> '{}')::numeric;
          EXCEPTION WHEN OTHERS THEN
            num_val := NULL;
          END;
          IF num_val IS NOT NULL AND q.numerical_answer IS NOT NULL
             AND abs(num_val - q.numerical_answer) <= COALESCE(q.tolerance, 0) THEN
            is_correct := true;
          END IF;
        ELSE
          cmp_correct := q.correct_answer;
          IF jsonb_typeof(cmp_correct) = 'object' AND cmp_correct ? 'value' THEN
            cmp_correct := cmp_correct -> 'value';
          END IF;
          IF cmp_correct = selected THEN
            is_correct := true;
          ELSIF cmp_correct IS NOT NULL AND (cmp_correct #>> '{}') = (selected #>> '{}') THEN
            is_correct := true;
          END IF;
      END CASE;

      IF is_correct THEN
        q_marks := COALESCE(q.marks_correct, 4);
        correct_count := correct_count + 1;
      ELSE
        q_marks := COALESCE(NULLIF(q.marks_wrong, 0), -1);
      END IF;
    END IF;

    total_score := total_score + q_marks;
    subj_key := COALESCE(q.subject, 'General');
    subject_data := jsonb_set(
      subject_data, ARRAY[subj_key],
      COALESCE(subject_data -> subj_key, '{"total":0,"correct":0,"attempted":0,"score":0}'::jsonb)
        || jsonb_build_object(
          'total', COALESCE((subject_data -> subj_key ->> 'total')::int, 0) + 1,
          'correct', COALESCE((subject_data -> subj_key ->> 'correct')::int, 0) + (CASE WHEN is_correct THEN 1 ELSE 0 END),
          'attempted', COALESCE((subject_data -> subj_key ->> 'attempted')::int, 0) + (CASE WHEN is_attempted THEN 1 ELSE 0 END),
          'score', COALESCE((subject_data -> subj_key ->> 'score')::numeric, 0) + q_marks
        ),
      true
    );
    per_question := per_question || jsonb_build_array(jsonb_build_object(
      'question_id', q.id, 'position', q.position, 'subject', subj_key,
      'attempted', is_attempted, 'is_correct', is_correct, 'marks', q_marks
    ));
  END LOOP;

  SELECT COUNT(*) INTO total_attempts FROM public.test_attempts
    WHERE test_id = attempt.test_id AND status IN ('submitted','auto_submitted') AND id <> _attempt_id;
  SELECT COUNT(*) INTO lower_count FROM public.test_attempts
    WHERE test_id = attempt.test_id AND status IN ('submitted','auto_submitted')
    AND id <> _attempt_id AND score < total_score;
  pct := CASE WHEN total_attempts = 0 THEN 100 ELSE ROUND(lower_count::numeric * 100.0 / total_attempts, 1) END;

  UPDATE public.test_attempts
  SET score = total_score, correct_answers = correct_count, total_questions = total_count,
      percentile = pct,
      metadata = COALESCE(metadata, '{}'::jsonb)
                  || jsonb_build_object('subjects', subject_data, 'questions', per_question)
  WHERE id = _attempt_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._recompute_attempt(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.test_attempts WHERE status IN ('submitted','auto_submitted') LOOP
    PERFORM public._recompute_attempt(r.id);
  END LOOP;
END $$;
