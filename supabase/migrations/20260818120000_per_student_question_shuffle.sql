-- Per-student question shuffling: each student gets their own randomized
-- question order (within each subject; section boundaries/order stay fixed),
-- generated once per attempt and persisted so it survives reloads and can be
-- replayed on the student's result page and the admin's per-student view.

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT true;

-- Ordered array of test_questions.id (as text), generated once per attempt.
-- NULL = no shuffle applied (toggle off, or attempt predates this feature) ->
-- every consumer falls back to canonical test_questions.position order.
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS question_order jsonb;

-- Support tickets used to record only the on-screen index, which is now
-- per-student and not reproducible after the fact. Store the actual question
-- so admins can resolve it to a stable, canonical position/subject.
ALTER TABLE public.test_support_queries
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES public.test_questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tsq_question_id ON public.test_support_queries(question_id);

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

  -- Replay this attempt's stored per-student shuffle when present, else fall
  -- back to canonical position (covers pre-feature attempts and tests with
  -- shuffle_questions = false, where question_order is NULL).
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
      'numerical_answer', CASE WHEN v_released THEN q.numerical_answer ELSE NULL END,
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
