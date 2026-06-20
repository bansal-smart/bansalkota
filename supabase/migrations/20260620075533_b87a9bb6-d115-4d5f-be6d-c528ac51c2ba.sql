
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS answer_range_min numeric,
  ADD COLUMN IF NOT EXISTS answer_range_max numeric;

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS answer_range_min numeric,
  ADD COLUMN IF NOT EXISTS answer_range_max numeric;

CREATE OR REPLACE FUNCTION public.submit_test_attempt(_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  attempt RECORD;
  v_test RECORD;
  q RECORD;
  user_ans jsonb;
  selected jsonb;
  num_val numeric;
  is_correct boolean;
  is_attempted boolean;
  q_marks numeric;
  q_max numeric;
  total_score numeric := 0;
  correct_count int := 0;
  total_count int := 0;
  attempted_count int := 0;
  subject_data jsonb := '{}'::jsonb;
  per_question jsonb := '[]'::jsonb;
  subj_key text;
  subj_display text;
  pct numeric;
  lower_count int;
  total_attempts int;
  correct_arr jsonb;
  selected_arr jsonb;
  exact boolean;
  any_wrong boolean;
  selected_count int;
  correct_count_arr int;
  per_correct_marks numeric;
  k_text text;
  pair_total int;
  pair_correct int;
  pair_any boolean;
  pair_correct_val text;
  pair_user_val text;
  cmp_correct jsonb;
  correct_picked int;
BEGIN
  SELECT * INTO attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF attempt.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the student may submit their own test';
  END IF;

  SELECT * INTO v_test FROM public.tests WHERE id = attempt.test_id;

  FOR q IN SELECT * FROM public.test_questions WHERE test_id = attempt.test_id ORDER BY position LOOP
    total_count := total_count + 1;
    user_ans := COALESCE(attempt.answers -> q.id::text, NULL);
    selected := user_ans -> 'selected';
    is_correct := false;
    is_attempted := false;
    q_marks := 0;
    q_max := COALESCE(q.marks_correct, 4);

    IF selected IS NULL OR selected = 'null'::jsonb
       OR (jsonb_typeof(selected) = 'array' AND jsonb_array_length(selected) = 0)
       OR (jsonb_typeof(selected) = 'object' AND selected = '{}'::jsonb)
       OR (jsonb_typeof(selected) = 'string' AND length(trim(both '"' from selected::text)) = 0)
    THEN
      q_marks := COALESCE(q.marks_unanswered, 0);
    ELSE
      is_attempted := true;
      attempted_count := attempted_count + 1;

      CASE COALESCE(q.question_type, 'mcq-single')
        WHEN 'mcq-multi' THEN
          correct_arr := COALESCE(q.correct_answer, '[]'::jsonb);
          selected_arr := CASE WHEN jsonb_typeof(selected) = 'array' THEN selected ELSE jsonb_build_array(selected) END;
          selected_count := jsonb_array_length(selected_arr);
          correct_count_arr := jsonb_array_length(correct_arr);
          SELECT EXISTS (
            SELECT 1 FROM jsonb_array_elements(selected_arr) s
            WHERE NOT (correct_arr @> jsonb_build_array(s.value))
          ) INTO any_wrong;
          exact := (correct_arr @> selected_arr) AND (selected_arr @> correct_arr);
          SELECT COUNT(*)::int INTO correct_picked
          FROM jsonb_array_elements(selected_arr) s
          WHERE correct_arr @> jsonb_build_array(s.value);

          IF exact THEN
            is_correct := true; q_marks := q_max;
          ELSIF any_wrong THEN
            q_marks := COALESCE(q.marks_wrong, -1);
          ELSIF q.partial_marking AND correct_picked > 0 THEN
            q_marks := LEAST(correct_picked, q_max);
          ELSE
            q_marks := 0;
          END IF;

        WHEN 'match-following', 'matching-list' THEN
          correct_arr := COALESCE(q.correct_answer, '{}'::jsonb);
          pair_total := 0; pair_correct := 0; pair_any := false;
          IF jsonb_typeof(correct_arr) = 'object' AND jsonb_typeof(selected) = 'object' THEN
            FOR k_text IN SELECT jsonb_object_keys(correct_arr) LOOP
              pair_total := pair_total + 1;
              pair_correct_val := correct_arr ->> k_text;
              pair_user_val := selected ->> k_text;
              IF pair_user_val IS NOT NULL AND length(pair_user_val) > 0 THEN
                pair_any := true;
                IF pair_user_val = pair_correct_val THEN pair_correct := pair_correct + 1; END IF;
              END IF;
            END LOOP;
          END IF;
          IF pair_total > 0 AND pair_correct = pair_total THEN
            is_correct := true; q_marks := q_max;
          ELSIF q.partial_marking AND pair_correct > 0 THEN
            per_correct_marks := FLOOR(q_max::numeric / GREATEST(pair_total,1));
            IF per_correct_marks < 1 THEN per_correct_marks := 1; END IF;
            q_marks := LEAST(per_correct_marks * pair_correct, q_max);
          ELSIF pair_any THEN
            q_marks := COALESCE(q.marks_wrong, 0);
          ELSE
            q_marks := COALESCE(q.marks_unanswered, 0);
          END IF;

        WHEN 'numerical', 'integer' THEN
          BEGIN num_val := (selected #>> '{}')::numeric;
          EXCEPTION WHEN OTHERS THEN num_val := NULL; END;
          IF num_val IS NULL THEN
            q_marks := COALESCE(q.marks_wrong, 0);
          ELSIF q.answer_range_min IS NOT NULL AND q.answer_range_max IS NOT NULL THEN
            IF num_val >= LEAST(q.answer_range_min, q.answer_range_max)
               AND num_val <= GREATEST(q.answer_range_min, q.answer_range_max) THEN
              is_correct := true; q_marks := q_max;
            ELSE
              q_marks := COALESCE(q.marks_wrong, 0);
            END IF;
          ELSIF q.numerical_answer IS NOT NULL
                AND abs(num_val - q.numerical_answer) <= COALESCE(q.tolerance, 0) THEN
            is_correct := true; q_marks := q_max;
          ELSE
            q_marks := COALESCE(q.marks_wrong, 0);
          END IF;

        ELSE
          cmp_correct := q.correct_answer;
          IF jsonb_typeof(cmp_correct) = 'object' AND cmp_correct ? 'value' THEN
            cmp_correct := cmp_correct -> 'value';
          END IF;
          IF cmp_correct = selected THEN
            is_correct := true;
          ELSIF jsonb_typeof(cmp_correct) IS NOT NULL
                AND (cmp_correct #>> '{}') = (selected #>> '{}') THEN
            is_correct := true;
          END IF;
          IF is_correct THEN
            q_marks := q_max;
          ELSE
            q_marks := COALESCE(q.marks_wrong, 0);
          END IF;
      END CASE;

      IF is_correct THEN
        correct_count := correct_count + 1;
      END IF;
    END IF;

    total_score := total_score + q_marks;

    subj_display := COALESCE(NULLIF(trim(q.subject), ''), 'General');
    subj_key := initcap(lower(subj_display));
    subject_data := jsonb_set(
      subject_data, ARRAY[subj_key],
      COALESCE(subject_data -> subj_key, jsonb_build_object(
          'total', 0, 'correct', 0, 'attempted', 0, 'score', 0, 'max_score', 0,
          'label', subj_key
        ))
        || jsonb_build_object(
          'total', COALESCE((subject_data -> subj_key ->> 'total')::int, 0) + 1,
          'correct', COALESCE((subject_data -> subj_key ->> 'correct')::int, 0) + (CASE WHEN is_correct THEN 1 ELSE 0 END),
          'attempted', COALESCE((subject_data -> subj_key ->> 'attempted')::int, 0) + (CASE WHEN is_attempted THEN 1 ELSE 0 END),
          'score', COALESCE((subject_data -> subj_key ->> 'score')::numeric, 0) + q_marks,
          'max_score', COALESCE((subject_data -> subj_key ->> 'max_score')::numeric, 0) + q_max,
          'label', subj_key
        ),
      true
    );

    per_question := per_question || jsonb_build_array(jsonb_build_object(
      'question_id', q.id,
      'position', q.position,
      'subject', subj_key,
      'is_correct', is_correct,
      'is_attempted', is_attempted,
      'score', q_marks,
      'max_score', q_max
    ));
  END LOOP;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE score < total_score)
    INTO total_attempts, lower_count
  FROM (
    SELECT DISTINCT ON (user_id) user_id, score
    FROM public.test_attempts
    WHERE test_id = attempt.test_id AND submitted_at IS NOT NULL AND id <> _attempt_id
    ORDER BY user_id, score DESC NULLS LAST
  ) prior;

  pct := CASE WHEN total_attempts > 0 THEN ROUND(100.0 * lower_count / total_attempts) ELSE NULL END;

  UPDATE public.test_attempts
  SET score = total_score,
      total_questions = total_count,
      correct_answers = correct_count,
      submitted_at = now(),
      time_taken_seconds = COALESCE(time_taken_seconds, EXTRACT(EPOCH FROM (now() - started_at))::int),
      result = jsonb_build_object(
        'score', total_score, 'correct', correct_count, 'total', total_count,
        'attempted', attempted_count,
        'subjects', subject_data, 'per_question', per_question,
        'percentile_within_prior', pct
      )
  WHERE id = _attempt_id;

  RETURN jsonb_build_object('score', total_score, 'correct', correct_count, 'total', total_count);
END;
$function$;
