-- Same authorization gap, one level deeper: TestResultPage links to a
-- Responses sheet and a per-subject breakdown. Both of those pages' backing
-- RPCs also only recognized admin/super_admin/teacher/self, so a centre admin
-- who reached the result page (now fixed) would still hit "Not authorized"
-- clicking into either sub-view.
create or replace function public.get_attempt_response_sheet(_attempt_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
      'subject', q.subject,
      'topic', q.topic,
      'question_text', q.question_text,
      'question_image_url', q.question_image_url,
      'question_type', COALESCE(q.question_type, 'mcq-single'),
      'options', q.options,
      'option_images', q.option_images,
      'match_left', q.match_left,
      'correct_answer', CASE WHEN v_released THEN q.correct_answer ELSE NULL END,
      'numerical_answer', CASE WHEN v_released THEN q.numerical_answer ELSE NULL END,
      'explanation', CASE WHEN v_released THEN q.explanation ELSE NULL END,
      'solution_image_url', CASE WHEN v_released THEN q.solution_image_url ELSE NULL END,
      'marks_correct', q.marks_correct,
      'marks_wrong', q.marks_wrong,
      'is_bonus', COALESCE(q.is_bonus, false),
      'selected', v_attempt.answers -> q.id::text -> 'selected'
    ) ORDER BY q.position
  )
  INTO v_questions
  FROM public.test_questions q
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

create or replace function public.get_test_question_answers(_test_id uuid)
returns table(id uuid, correct_answer jsonb, explanation text, numerical_answer numeric, question_type text, tolerance numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
  SELECT q.id, q.correct_answer, q.explanation, q.numerical_answer, q.question_type, q.tolerance
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$function$;
