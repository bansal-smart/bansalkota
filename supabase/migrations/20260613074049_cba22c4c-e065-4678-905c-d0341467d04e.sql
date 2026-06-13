
ALTER TABLE public.question_bank   ADD COLUMN IF NOT EXISTS match_left jsonb;
ALTER TABLE public.test_questions  ADD COLUMN IF NOT EXISTS match_left jsonb;

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
  q_marks numeric;
  total_score numeric := 0;
  correct_count int := 0;
  total_count int := 0;
  attempted_count int := 0;
  subject_data jsonb := '{}'::jsonb;
  subj_key text;
  pct numeric;
  lower_count int;
  total_attempts int;
  correct_arr jsonb;
  selected_arr jsonb;
  any_wrong boolean;
  exact boolean;
  selected_count int;
  correct_count_arr int;
  per_correct_marks numeric;
  k_text text;
  pair_total int;
  pair_correct int;
  pair_any boolean;
  pair_correct_val text;
  pair_user_val text;
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
    q_marks := 0;

    IF selected IS NULL OR selected = 'null'::jsonb
       OR (jsonb_typeof(selected) = 'array' AND jsonb_array_length(selected) = 0)
       OR (jsonb_typeof(selected) = 'object' AND selected = '{}'::jsonb)
       OR (jsonb_typeof(selected) = 'string' AND length(trim(both '"' from selected::text)) = 0)
    THEN
      q_marks := COALESCE(q.marks_unanswered, 0);
    ELSE
      attempted_count := attempted_count + 1;

      CASE COALESCE(q.question_type, 'mcq-single')
        WHEN 'mcq-single', 'assertion-reason' THEN
          IF q.correct_answer = selected THEN
            is_correct := true; q_marks := COALESCE(q.marks_correct, 4); correct_count := correct_count + 1;
          ELSE
            q_marks := COALESCE(q.marks_wrong, -1);
          END IF;

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

          IF exact THEN
            is_correct := true; q_marks := COALESCE(q.marks_correct, 4); correct_count := correct_count + 1;
          ELSIF any_wrong THEN
            q_marks := COALESCE(q.marks_wrong, -2);
          ELSIF q.partial_marking AND selected_count > 0 AND correct_count_arr > 0 THEN
            per_correct_marks := FLOOR(COALESCE(q.marks_correct, 4)::numeric / correct_count_arr);
            IF per_correct_marks < 1 THEN per_correct_marks := 1; END IF;
            q_marks := LEAST(
              per_correct_marks * selected_count,
              COALESCE(q.marks_correct, 4)
            );
          ELSE
            q_marks := 0;
          END IF;

        WHEN 'match-following' THEN
          -- correct_answer expected as object {"A":"Q","B":"S",...}
          -- selected expected as object too
          correct_arr := COALESCE(q.correct_answer, '{}'::jsonb);
          pair_total := 0;
          pair_correct := 0;
          pair_any := false;
          IF jsonb_typeof(correct_arr) = 'object' AND jsonb_typeof(selected) = 'object' THEN
            FOR k_text IN SELECT jsonb_object_keys(correct_arr) LOOP
              pair_total := pair_total + 1;
              pair_correct_val := correct_arr ->> k_text;
              pair_user_val := selected ->> k_text;
              IF pair_user_val IS NOT NULL AND length(pair_user_val) > 0 THEN
                pair_any := true;
                IF pair_user_val = pair_correct_val THEN
                  pair_correct := pair_correct + 1;
                END IF;
              END IF;
            END LOOP;
          END IF;

          IF pair_total > 0 AND pair_correct = pair_total THEN
            is_correct := true;
            q_marks := COALESCE(q.marks_correct, 4);
            correct_count := correct_count + 1;
          ELSIF q.partial_marking AND pair_correct > 0 THEN
            per_correct_marks := FLOOR(COALESCE(q.marks_correct, 4)::numeric / GREATEST(pair_total,1));
            IF per_correct_marks < 1 THEN per_correct_marks := 1; END IF;
            q_marks := LEAST(per_correct_marks * pair_correct, COALESCE(q.marks_correct, 4));
          ELSIF pair_any THEN
            q_marks := COALESCE(q.marks_wrong, -1);
          ELSE
            q_marks := COALESCE(q.marks_unanswered, 0);
          END IF;

        WHEN 'numerical', 'integer' THEN
          BEGIN
            num_val := (selected #>> '{}')::numeric;
          EXCEPTION WHEN OTHERS THEN
            num_val := NULL;
          END;
          IF num_val IS NULL THEN
            q_marks := COALESCE(q.marks_wrong, -1);
          ELSIF q.numerical_answer IS NOT NULL
                AND abs(num_val - q.numerical_answer) <= COALESCE(q.tolerance, 0) THEN
            is_correct := true; q_marks := COALESCE(q.marks_correct, 4); correct_count := correct_count + 1;
          ELSE
            q_marks := COALESCE(q.marks_wrong, -1);
          END IF;

        ELSE
          IF q.correct_answer = selected THEN
            is_correct := true; q_marks := COALESCE(q.marks_correct, 4); correct_count := correct_count + 1;
          ELSE
            q_marks := COALESCE(q.marks_wrong, -1);
          END IF;
      END CASE;
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
          'attempted', COALESCE((subject_data -> subj_key ->> 'attempted')::int, 0)
                       + (CASE WHEN selected IS NOT NULL AND selected <> 'null'::jsonb THEN 1 ELSE 0 END),
          'score', COALESCE((subject_data -> subj_key ->> 'score')::numeric, 0) + q_marks
        ),
      true
    );
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
      status = 'submitted',
      submitted_at = COALESCE(submitted_at, now())
  WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'score', total_score, 'correct', correct_count, 'total', total_count,
    'attempted', attempted_count, 'percentile', pct, 'subjects', subject_data
  );
END;
$function$;
