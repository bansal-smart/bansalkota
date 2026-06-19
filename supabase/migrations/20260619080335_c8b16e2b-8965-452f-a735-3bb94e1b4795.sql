-- 1. Rewrite submit_test_attempt with always-on JEE Advanced partial marking for mcq-multi
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

          -- Always-on JEE Advanced scheme
          IF exact THEN
            is_correct := true; q_marks := q_max;
          ELSIF any_wrong THEN
            q_marks := COALESCE(NULLIF(q.marks_wrong, 0), -2);
          ELSE
            -- Subset of correct, no wrong: +1 per correctly picked, cap at q_max
            q_marks := LEAST(correct_picked, q_max);
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
          IF num_val IS NOT NULL AND q.numerical_answer IS NOT NULL
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
      'question_type', COALESCE(q.question_type, 'mcq-single'),
      'attempted', is_attempted,
      'is_correct', is_correct,
      'marks', q_marks,
      'max_marks', q_max,
      'selected', selected,
      'correct', q.correct_answer,
      'numerical_answer', q.numerical_answer
    ));
  END LOOP;

  WITH latest AS (
    SELECT DISTINCT ON (user_id) user_id, score
    FROM public.test_attempts
    WHERE test_id = attempt.test_id
      AND status IN ('submitted','auto_submitted')
      AND user_id <> attempt.user_id
      AND user_id NOT IN (
        SELECT user_id FROM public.test_result_exclusions WHERE test_id = attempt.test_id
      )
    ORDER BY user_id, submitted_at DESC NULLS LAST
  )
  SELECT COUNT(*), COUNT(*) FILTER (WHERE score < total_score)
  INTO total_attempts, lower_count FROM latest;

  pct := CASE WHEN total_attempts = 0 THEN 100
              ELSE ROUND(lower_count::numeric * 100.0 / total_attempts, 1) END;

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

-- 2. Test support queries table
CREATE TABLE IF NOT EXISTS public.test_support_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  attempt_id uuid REFERENCES public.test_attempts(id) ON DELETE SET NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  question_position int,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.test_support_queries TO authenticated;
GRANT UPDATE ON public.test_support_queries TO authenticated;
GRANT ALL ON public.test_support_queries TO service_role;

ALTER TABLE public.test_support_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert their own support queries"
  ON public.test_support_queries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view their own or staff view all"
  ON public.test_support_queries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Staff update support queries"
  ON public.test_support_queries FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_tsq_user ON public.test_support_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_tsq_status ON public.test_support_queries(status);
CREATE INDEX IF NOT EXISTS idx_tsq_created ON public.test_support_queries(created_at DESC);

CREATE TRIGGER trg_tsq_updated_at
  BEFORE UPDATE ON public.test_support_queries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_test_support_query()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'Test support request',
    'A student needs help during a live test: ' || left(NEW.message, 160),
    'test_support',
    '/admin/test-support'
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_test_support_query
  AFTER INSERT ON public.test_support_queries
  FOR EACH ROW EXECUTE FUNCTION public.notify_test_support_query();