-- "Any one" mode for multi-value numerical questions.
-- answer_match_mode = 'all'  : the student enters every value (existing behaviour).
-- answer_match_mode = 'any'  : the question lists several accepted values, the student
--                              enters one, and any accepted value earns full marks.
-- answer_count is the number of accepted values the author lists; in 'any' mode the
-- student sees a single box.

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS answer_match_mode text NOT NULL DEFAULT 'all'
  CHECK (answer_match_mode IN ('all', 'any'));

-- Students need the mode to decide how many boxes to show (the accepted values stay hidden).
GRANT SELECT (answer_match_mode) ON public.test_questions TO authenticated;

CREATE OR REPLACE FUNCTION public.numeric_any_match(_selected jsonb, _correct numeric[], _tolerance numeric)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  tol numeric := COALESCE(_tolerance, 0);
  raw text;
  v numeric;
  c numeric;
  i int;
  n int;
BEGIN
  IF _selected IS NULL OR _correct IS NULL THEN RETURN false; END IF;
  IF jsonb_typeof(_selected) <> 'array' THEN _selected := jsonb_build_array(_selected); END IF;
  n := jsonb_array_length(_selected);
  FOR i IN 0..n - 1 LOOP
    raw := trim(_selected ->> i);
    CONTINUE WHEN raw IS NULL OR raw = '';
    BEGIN
      v := raw::numeric;
      IF v = 'NaN'::numeric OR v = 'Infinity'::numeric OR v = '-Infinity'::numeric THEN CONTINUE; END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
    FOREACH c IN ARRAY _correct LOOP
      IF abs(v - c) <= tol THEN RETURN true; END IF;
    END LOOP;
  END LOOP;
  RETURN false;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_get_test_questions_full(uuid);
CREATE FUNCTION public.admin_get_test_questions_full(_test_id uuid)
RETURNS TABLE(
  id uuid,
  correct_answer jsonb,
  numerical_answer numeric,
  explanation text,
  tolerance numeric,
  answer_range_min numeric,
  answer_range_max numeric,
  solution_image_url text,
  numerical_answers numeric[],
  answer_count smallint,
  answer_order_matters boolean,
  answer_match_mode text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = _test_id
        AND t.centre_id IS NOT NULL
        AND public.is_centre_staff(auth.uid(), t.centre_id)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_answer::jsonb, q.numerical_answer, q.explanation,
         q.tolerance, q.answer_range_min, q.answer_range_max, q.solution_image_url,
         q.numerical_answers, q.answer_count, q.answer_order_matters, q.answer_match_mode
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_get_test_questions_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_test_questions_full(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_test_question_answers(uuid);
CREATE FUNCTION public.get_test_question_answers(_test_id uuid)
RETURNS TABLE(
  id uuid,
  correct_answer jsonb,
  explanation text,
  numerical_answer numeric,
  question_type text,
  tolerance numeric,
  numerical_answers numeric[],
  answer_count smallint,
  answer_order_matters boolean,
  answer_match_mode text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.test_attempts
    WHERE test_id = _test_id AND user_id = auth.uid()
      AND status IN ('submitted','auto_submitted')
  )
  AND NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role))
  AND NOT EXISTS (
    SELECT 1
    FROM public.test_attempts ta
    JOIN public.profiles p ON p.user_id = ta.user_id
    WHERE ta.test_id = _test_id
      AND p.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_platform', 'view', p.centre_id)
  ) THEN
    RAISE EXCEPTION 'Must submit test before viewing answers';
  END IF;
  RETURN QUERY
  SELECT q.id, q.correct_answer, q.explanation, q.numerical_answer, q.question_type, q.tolerance,
         q.numerical_answers, q.answer_count, q.answer_order_matters, q.answer_match_mode
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_test_question_answers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_test_question_answers(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.build_numeric_spec(_test_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_object_agg(q.id::text, jsonb_build_object(
    'c', COALESCE(q.answer_count, 1),
    'm', COALESCE(q.answer_match_mode, 'all'),
    'v', to_jsonb(q.numerical_answers),
    'o', COALESCE(q.answer_order_matters, false),
    'p', COALESCE(q.partial_marking, false),
    'n', q.numerical_answer,
    't', COALESCE(q.tolerance, 0),
    'rmin', q.answer_range_min,
    'rmax', q.answer_range_max
  )), '{}'::jsonb)
  FROM public.test_questions q
  WHERE q.test_id = _test_id AND q.question_type IN ('numerical', 'integer');
$function$;

CREATE OR REPLACE FUNCTION public.get_my_attempt_answer_counts(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_spec jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.test_attempts WHERE id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT spec INTO v_spec FROM public.test_attempt_numeric_specs WHERE attempt_id = _attempt_id;
  RETURN COALESCE(
    (SELECT jsonb_object_agg(e.key, CASE WHEN COALESCE(e.value ->> 'm', 'all') = 'any' THEN to_jsonb(1) ELSE e.value -> 'c' END) FROM jsonb_each(COALESCE(v_spec, '{}'::jsonb)) e),
    '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_multi_numeric_answers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max smallint;
BEGIN
  IF COALESCE(NEW.question_type, 'mcq-single') NOT IN ('numerical', 'integer')
     OR COALESCE(NEW.answer_count, 1) <= 1 THEN
    NEW.answer_count := 1;
    NEW.numerical_answers := NULL;
    NEW.answer_order_matters := false;
    NEW.answer_match_mode := 'all';
  ELSE
    SELECT max_answers_per_question INTO v_max FROM public.tests WHERE id = NEW.test_id;
    IF NEW.answer_count > COALESCE(v_max, 1) THEN
      RAISE EXCEPTION 'This test allows at most % answers per question (question asks for %).',
        COALESCE(v_max, 1), NEW.answer_count USING ERRCODE = 'P0001';
    END IF;
    IF NEW.numerical_answers IS NULL
       OR COALESCE(cardinality(NEW.numerical_answers), 0) <> NEW.answer_count
       OR array_position(NEW.numerical_answers, NULL) IS NOT NULL THEN
      RAISE EXCEPTION 'A question with % answers needs exactly % numeric correct values.',
        NEW.answer_count, NEW.answer_count USING ERRCODE = 'P0001';
    END IF;
    IF NEW.answer_range_min IS NOT NULL OR NEW.answer_range_max IS NOT NULL THEN
      RAISE EXCEPTION 'Range answers cannot be combined with multiple answers.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NEW.answer_match_mode = 'any' THEN
    NEW.answer_order_matters := false;
    NEW.partial_marking := false;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_test_attempt(_attempt_id uuid)
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
  q_max numeric;
  total_score numeric := 0;
  correct_count int := 0;
  total_count int := 0;
  attempted_count int := 0;
  subject_data jsonb := '{}'::jsonb;
  subject_meta jsonb := '{}'::jsonb;
  per_question jsonb := '[]'::jsonb;
  meta_questions jsonb := '[]'::jsonb;
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
  has_selection boolean;
  multi_res jsonb;
  multi_matched int;
  multi_entered int;
  spec jsonb;
  snap jsonb;
  e_count int;
  e_values numeric[];
  e_order boolean;
  e_mode text;
  e_partial boolean;
  e_num numeric;
  e_tol numeric;
  e_rmin numeric;
  e_rmax numeric;
  scalar_text text;
BEGIN
  SELECT * INTO attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  -- Answer rules as they stood when the student started. Used only for a question
  -- whose number of answers has changed since, so earlier attempts stay on the old rule.
  SELECT s.spec INTO spec FROM public.test_attempt_numeric_specs s WHERE s.attempt_id = _attempt_id;
  spec := COALESCE(spec, '{}'::jsonb);

  FOR q IN SELECT * FROM public.test_questions WHERE test_id = attempt.test_id ORDER BY position LOOP
    total_count := total_count + 1;
    user_ans := COALESCE(attempt.answers -> q.id::text, NULL);
    selected := user_ans -> 'selected';
    is_correct := false;
    is_attempted := false;
    q_marks := 0;
    q_max := COALESCE(q.marks_correct, 4);

    has_selection := NOT (
      selected IS NULL OR selected = 'null'::jsonb
      OR (jsonb_typeof(selected) = 'array' AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(selected) e(v) WHERE trim(e.v) <> ''))
      OR (jsonb_typeof(selected) = 'object' AND selected = '{}'::jsonb)
      OR (jsonb_typeof(selected) = 'string' AND length(trim(both '"' from selected::text)) = 0)
    );

    -- BONUS: award full marks regardless of attempt
    IF COALESCE(q.is_bonus, false) THEN
      is_correct := true;
      is_attempted := has_selection;
      IF has_selection THEN attempted_count := attempted_count + 1; END IF;
      q_marks := q_max;
      correct_count := correct_count + 1;
    ELSIF NOT has_selection THEN
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
          snap := spec -> q.id::text;
          IF snap IS NOT NULL AND jsonb_typeof(snap) = 'object'
             AND ((snap ->> 'c')::int IS DISTINCT FROM COALESCE(q.answer_count, 1)
                  OR COALESCE(snap ->> 'm', 'all') IS DISTINCT FROM COALESCE(q.answer_match_mode, 'all')) THEN
            e_count   := (snap ->> 'c')::int;
            e_values  := CASE WHEN jsonb_typeof(snap -> 'v') = 'array'
                              THEN ARRAY(SELECT jsonb_array_elements_text(snap -> 'v')::numeric) ELSE NULL END;
            e_order   := COALESCE((snap ->> 'o')::boolean, false);
            e_mode    := COALESCE(snap ->> 'm', 'all');
            e_partial := COALESCE((snap ->> 'p')::boolean, false);
            e_num     := NULLIF(snap ->> 'n', '')::numeric;
            e_tol     := COALESCE((snap ->> 't')::numeric, 0);
            e_rmin    := NULLIF(snap ->> 'rmin', '')::numeric;
            e_rmax    := NULLIF(snap ->> 'rmax', '')::numeric;
          ELSE
            e_count   := COALESCE(q.answer_count, 1);
            e_values  := q.numerical_answers;
            e_order   := COALESCE(q.answer_order_matters, false);
            e_mode    := COALESCE(q.answer_match_mode, 'all');
            e_partial := COALESCE(q.partial_marking, false);
            e_num     := q.numerical_answer;
            e_tol     := COALESCE(q.tolerance, 0);
            e_rmin    := q.answer_range_min;
            e_rmax    := q.answer_range_max;
          END IF;

          IF e_count > 1 AND e_values IS NOT NULL AND e_mode = 'any' THEN
            -- Any one accepted value earns full marks.
            IF public.numeric_any_match(selected, e_values, e_tol) THEN
              is_correct := true; q_marks := q_max;
            ELSE
              q_marks := COALESCE(q.marks_wrong, 0);
            END IF;
          ELSIF e_count > 1 AND e_values IS NOT NULL THEN
            multi_res := public.numeric_multi_match(selected, e_values, e_tol, e_order);
            multi_matched := (multi_res ->> 'matched')::int;
            multi_entered := (multi_res ->> 'entered')::int;
            IF multi_matched = e_count AND multi_entered = e_count THEN
              is_correct := true; q_marks := q_max;
            ELSIF e_partial AND multi_matched > 0 AND multi_entered = multi_matched THEN
              q_marks := round(q_max * multi_matched / e_count, 2);
            ELSE
              q_marks := COALESCE(q.marks_wrong, 0);
            END IF;
          ELSE
            -- Single-answer rule. If the student's screen had several boxes, use the first filled one.
            IF jsonb_typeof(selected) = 'array' THEN
              scalar_text := (SELECT e.v FROM jsonb_array_elements_text(selected) WITH ORDINALITY e(v, ord)
                              WHERE trim(e.v) <> '' ORDER BY e.ord LIMIT 1);
            ELSE
              scalar_text := selected #>> '{}';
            END IF;
            BEGIN num_val := scalar_text::numeric;
            EXCEPTION WHEN OTHERS THEN num_val := NULL; END;
            IF num_val IS NULL THEN
              q_marks := COALESCE(q.marks_wrong, 0);
            ELSIF e_rmin IS NOT NULL AND e_rmax IS NOT NULL THEN
              IF num_val >= LEAST(e_rmin, e_rmax) AND num_val <= GREATEST(e_rmin, e_rmax) THEN
                is_correct := true; q_marks := q_max;
              ELSE
                q_marks := COALESCE(q.marks_wrong, 0);
              END IF;
            ELSIF e_num IS NOT NULL AND abs(num_val - e_num) <= e_tol THEN
              is_correct := true; q_marks := q_max;
            ELSE
              q_marks := COALESCE(q.marks_wrong, 0);
            END IF;
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

    subject_meta := jsonb_set(
      subject_meta, ARRAY[subj_key],
      to_jsonb(COALESCE((subject_meta ->> subj_key)::numeric, 0) + q_marks),
      true
    );

    per_question := per_question || jsonb_build_array(jsonb_build_object(
      'question_id', q.id,
      'position', q.position,
      'subject', subj_key,
      'is_correct', is_correct,
      'is_attempted', is_attempted,
      'is_bonus', COALESCE(q.is_bonus, false),
      'score', q_marks,
      'max_score', q_max
    ));

    meta_questions := meta_questions || jsonb_build_array(jsonb_build_object(
      'question_id', q.id,
      'position', q.position,
      'subject', subj_key,
      'attempted', is_attempted,
      'is_correct', is_correct,
      'is_bonus', COALESCE(q.is_bonus, false),
      'marks', q_marks,
      'max_marks', q_max
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
      percentile = pct,
      submitted_at = COALESCE(submitted_at, now()),
      time_spent_seconds = COALESCE(time_spent_seconds, EXTRACT(EPOCH FROM (now() - started_at))::int),
      metadata = COALESCE(metadata, '{}'::jsonb)
                 || jsonb_build_object(
                      'subjects', subject_meta,
                      'questions', meta_questions,
                      'attempted', attempted_count,
                      'correct', correct_count,
                      'total', total_count
                    ),
      result = jsonb_build_object(
        'score', total_score, 'correct', correct_count, 'total', total_count,
        'attempted', attempted_count,
        'subjects', subject_data, 'per_question', per_question,
        'percentile_within_prior', pct
      )
  WHERE id = _attempt_id;

  RETURN jsonb_build_object('score', total_score, 'correct', correct_count, 'total', total_count, 'percentile', pct);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_attempt_response_sheet(_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_questions jsonb;
  v_released boolean;
  v_student_centre uuid;
  v_authorized boolean;
BEGIN
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

  IF v_attempt.status NOT IN ('submitted','auto_submitted') THEN
    RAISE EXCEPTION 'Attempt not submitted';
  END IF;

  v_released := public.test_results_released(v_attempt.test_id);

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'position', q.position,
      'display_index', ord.rn - 1,
      'subject', q.subject,
      'topic', q.topic,
      'question_text', q.question_text,
      'question_image_url', q.question_image_url,
      'question_type', COALESCE(q.question_type, 'mcq-single'),
      'options', q.options,
      'option_images', q.option_images,
      'match_left', q.match_left,
      'correct_answer', CASE WHEN v_released THEN q.correct_answer ELSE NULL END,
      'numerical_answer', CASE
          WHEN NOT v_released THEN NULL
          WHEN sn.snap IS NOT NULL AND ((sn.snap ->> 'c')::int IS DISTINCT FROM q.answer_count OR COALESCE(sn.snap ->> 'm', 'all') IS DISTINCT FROM q.answer_match_mode) THEN NULLIF(sn.snap ->> 'n', '')::numeric
          ELSE q.numerical_answer END,
      'numerical_answers', CASE
          WHEN NOT v_released THEN NULL
          WHEN sn.snap IS NOT NULL AND ((sn.snap ->> 'c')::int IS DISTINCT FROM q.answer_count OR COALESCE(sn.snap ->> 'm', 'all') IS DISTINCT FROM q.answer_match_mode) THEN sn.snap -> 'v'
          ELSE to_jsonb(q.numerical_answers) END,
      'answer_count', CASE
          WHEN sn.snap IS NOT NULL AND ((sn.snap ->> 'c')::int IS DISTINCT FROM q.answer_count OR COALESCE(sn.snap ->> 'm', 'all') IS DISTINCT FROM q.answer_match_mode) THEN (sn.snap ->> 'c')::int
          ELSE q.answer_count END,
      'answer_order_matters', CASE
          WHEN sn.snap IS NOT NULL AND ((sn.snap ->> 'c')::int IS DISTINCT FROM q.answer_count OR COALESCE(sn.snap ->> 'm', 'all') IS DISTINCT FROM q.answer_match_mode) THEN COALESCE((sn.snap ->> 'o')::boolean, false)
          ELSE q.answer_order_matters END,
      'answer_match_mode', CASE
          WHEN sn.snap IS NOT NULL AND ((sn.snap ->> 'c')::int IS DISTINCT FROM q.answer_count OR COALESCE(sn.snap ->> 'm', 'all') IS DISTINCT FROM q.answer_match_mode) THEN COALESCE(sn.snap ->> 'm', 'all')
          ELSE q.answer_match_mode END,
      'explanation', CASE WHEN v_released THEN q.explanation ELSE NULL END,
      'solution_image_url', CASE WHEN v_released THEN q.solution_image_url ELSE NULL END,
      'marks_correct', q.marks_correct,
      'marks_wrong', q.marks_wrong,
      'is_bonus', COALESCE(q.is_bonus, false),
      'selected', v_attempt.answers -> q.id::text -> 'selected'
    ) ORDER BY ord.rn
  )
  INTO v_questions
  FROM public.test_questions q
  LEFT JOIN LATERAL (
    SELECT sp.spec -> q.id::text AS snap
    FROM public.test_attempt_numeric_specs sp
    WHERE sp.attempt_id = v_attempt.id
  ) sn ON true
  JOIN LATERAL (
    SELECT
      CASE
        WHEN v_attempt.question_order IS NOT NULL
          THEN (SELECT ord2.rn
                FROM jsonb_array_elements_text(v_attempt.question_order) WITH ORDINALITY AS ord2(qid, rn)
                WHERE ord2.qid = q.id::text)
        ELSE q.position
      END AS rn
  ) ord ON true
  WHERE q.test_id = v_attempt.test_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'test_id', v_attempt.test_id,
    'released', v_released,
    'status', v_attempt.status,
    'score', v_attempt.score,
    'percentile', v_attempt.percentile,
    'metadata', v_attempt.metadata,
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$function$;
