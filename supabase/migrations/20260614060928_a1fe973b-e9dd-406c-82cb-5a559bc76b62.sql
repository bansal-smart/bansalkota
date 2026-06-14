
-- 1. Exclusions table
CREATE TABLE public.test_result_exclusions (
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  excluded_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (test_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_result_exclusions TO authenticated;
GRANT ALL ON public.test_result_exclusions TO service_role;

ALTER TABLE public.test_result_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view exclusions"
  ON public.test_result_exclusions FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins manage exclusions"
  ON public.test_result_exclusions FOR ALL
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 2. RPC to toggle exclusion
CREATE OR REPLACE FUNCTION public.admin_toggle_result_exclusion(
  _test_id uuid, _user_id uuid, _exclude boolean, _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _exclude THEN
    INSERT INTO public.test_result_exclusions(test_id, user_id, excluded_by, reason)
    VALUES (_test_id, _user_id, auth.uid(), _reason)
    ON CONFLICT (test_id, user_id) DO UPDATE
      SET excluded_by = EXCLUDED.excluded_by, reason = EXCLUDED.reason, created_at = now();
  ELSE
    DELETE FROM public.test_result_exclusions
    WHERE test_id = _test_id AND user_id = _user_id;
  END IF;
  RETURN jsonb_build_object('test_id', _test_id, 'user_id', _user_id, 'excluded', _exclude);
END;
$$;

-- 3. Update result sheet to skip exclusions
CREATE OR REPLACE FUNCTION public.admin_test_result_sheet(_test_id uuid)
RETURNS TABLE(user_id uuid, roll_number text, full_name text, batch_id uuid, batch_name text, batch_code text, subjects jsonb, total_score numeric, percentage numeric, rank_label text, rank_num integer, status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_test RECORD;
  v_total_marks numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_test FROM public.tests WHERE id = _test_id;
  IF v_test IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;

  v_total_marks := COALESCE(NULLIF(v_test.total_marks, 0), 1);

  RETURN QUERY
  WITH
  excluded AS (
    SELECT user_id FROM public.test_result_exclusions WHERE test_id = _test_id
  ),
  attempts AS (
    SELECT DISTINCT ON (ta.user_id)
      ta.user_id, ta.score, ta.metadata
    FROM public.test_attempts ta
    WHERE ta.test_id = _test_id
      AND ta.status IN ('submitted', 'auto_submitted')
      AND ta.user_id NOT IN (SELECT user_id FROM excluded)
    ORDER BY ta.user_id, ta.submitted_at DESC NULLS LAST
  ),
  audience AS (
    SELECT p.user_id FROM public.profiles p
    WHERE p.user_id NOT IN (SELECT user_id FROM excluded)
      AND (
      v_test.cbt_allowed_batch_ids IS NOT NULL
      AND array_length(v_test.cbt_allowed_batch_ids, 1) > 0
      AND p.batch_id = ANY(v_test.cbt_allowed_batch_ids)
    )
    UNION
    SELECT e.user_id FROM public.enrollments e
    WHERE v_test.course_id IS NOT NULL
      AND e.course_id = v_test.course_id AND e.is_active = true
      AND e.user_id NOT IN (SELECT user_id FROM excluded)
    UNION
    SELECT a.user_id FROM attempts a
  ),
  joined AS (
    SELECT p.user_id, p.roll_number, p.full_name, p.batch_id,
           cb.name AS batch_name, cb.code AS batch_code,
           a.score, a.metadata, (a.user_id IS NOT NULL) AS is_present
    FROM audience aud
    JOIN public.profiles p ON p.user_id = aud.user_id
    LEFT JOIN public.course_batches cb ON cb.id = p.batch_id
    LEFT JOIN attempts a ON a.user_id = p.user_id
  ),
  with_subjects AS (
    SELECT j.*,
      CASE WHEN j.is_present AND jsonb_typeof(j.metadata -> 'subjects') = 'object' THEN (
        SELECT jsonb_object_agg(s.key, COALESCE((s.value ->> 'score')::numeric, 0))
        FROM jsonb_each(j.metadata -> 'subjects') s
      ) ELSE NULL END AS subj_obj
    FROM joined j
  ),
  ranked AS (
    SELECT w.*,
      CASE WHEN w.is_present THEN ROUND(COALESCE(w.score, 0) * 100.0 / v_total_marks, 2) ELSE NULL END AS pct,
      CASE WHEN w.is_present THEN RANK() OVER (
        PARTITION BY (CASE WHEN w.is_present THEN 1 ELSE 0 END)
        ORDER BY COALESCE(w.score, 0) DESC
      ) ELSE NULL END AS r_num
    FROM with_subjects w
  )
  SELECT r.user_id, r.roll_number, r.full_name, r.batch_id, r.batch_name, r.batch_code,
         COALESCE(r.subj_obj, '{}'::jsonb),
         CASE WHEN r.is_present THEN COALESCE(r.score, 0) ELSE NULL END,
         r.pct,
         CASE WHEN r.is_present THEN r.r_num::text ELSE 'ABS' END,
         r.r_num::int,
         CASE WHEN r.is_present THEN 'present' ELSE 'absent' END
  FROM ranked r
  ORDER BY
    CASE WHEN r.is_present THEN 0 ELSE 1 END,
    COALESCE(r.score, -999999) DESC,
    r.roll_number NULLS LAST,
    r.full_name NULLS LAST;
END;
$function$;

-- 4. get_test_rank: filter excluded students, surface excluded flag to self
CREATE OR REPLACE FUNCTION public.get_test_rank(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_released boolean;
  v_rank int;
  v_total int;
  v_topper numeric;
  v_avg numeric;
  v_compare_score numeric;
  v_excluded boolean;
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
    RETURN jsonb_build_object(
      'excluded', true,
      'released', v_released,
      'your_score', v_attempt.score
    );
  END IF;

  IF NOT v_released THEN
    RETURN jsonb_build_object(
      'released', false,
      'release_at', v_test.ends_at,
      'your_score', v_attempt.score
    );
  END IF;

  WITH self_latest AS (
    SELECT score FROM public.test_attempts
    WHERE test_id = v_attempt.test_id
      AND user_id = v_attempt.user_id
      AND status IN ('submitted','auto_submitted')
    ORDER BY submitted_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT COALESCE((SELECT score FROM self_latest), v_attempt.score)
  INTO v_compare_score;

  WITH latest AS (
    SELECT DISTINCT ON (user_id) user_id, score
    FROM public.test_attempts
    WHERE test_id = v_attempt.test_id
      AND status IN ('submitted','auto_submitted')
      AND user_id NOT IN (
        SELECT user_id FROM public.test_result_exclusions WHERE test_id = v_attempt.test_id
      )
    ORDER BY user_id, submitted_at DESC NULLS LAST
  )
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE score > v_compare_score) + 1,
         MAX(score),
         AVG(score)
  INTO v_total, v_rank, v_topper, v_avg
  FROM latest;

  RETURN jsonb_build_object(
    'released', true,
    'excluded', false,
    'rank', v_rank,
    'total', v_total,
    'percentile', CASE WHEN v_total <= 1 THEN 100
                       ELSE ROUND((v_total - v_rank)::numeric * 100.0 / (v_total), 1) END,
    'your_score', v_compare_score,
    'topper_score', v_topper,
    'average_score', ROUND(COALESCE(v_avg,0)::numeric, 2)
  );
END;
$function$;

-- 5. submit_test_attempt percentile: skip excluded students
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

  IF attempt.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the student may submit their own test';
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
          BEGIN num_val := (selected #>> '{}')::numeric;
          EXCEPTION WHEN OTHERS THEN num_val := NULL; END;
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
