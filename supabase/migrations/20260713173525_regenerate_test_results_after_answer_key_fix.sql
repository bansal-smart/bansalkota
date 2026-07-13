-- Lets whoever owns a test (super_admin/admin, or a centre_admin/test_platform-
-- permitted centre staff for their own centre's test) fix a wrong "correct
-- answer" on an already-completed, already-released test, and recompute every
-- submitted attempt's score/rank from the corrected answer key. Mirrors the
-- existing admin_set_question_bonus() pattern (stable-id update + audit log +
-- loop score_test_attempt() over submitted/auto_submitted attempts + refresh
-- the cached leaderboard) but additionally supports centre_admin, since
-- admin_set_question_bonus() is admin/super_admin-only.
--
-- Scope: only test_questions.correct_answer (the actual "answer key" for
-- mcq-single/mcq-multi/match-following). Numerical/integer questions' range/
-- tolerance fields are out of scope for this pass.
--
-- Release (tests.results_released_at) is intentionally left untouched —
-- recompute does not auto re-release or auto resend result SMS; the admin
-- reviews the new numbers and re-releases/resends manually, same as today's
-- already-decoupled release/SMS actions.
CREATE TABLE public.test_question_answer_key_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  old_correct_answer jsonb,
  new_correct_answer jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  updated_attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_question_answer_key_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read answer key change log"
ON public.test_question_answer_key_log FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_question_answer_key_log.test_id
      AND t.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_platform', 'view', t.centre_id)
  )
);

CREATE OR REPLACE FUNCTION public.admin_update_question_answer_key(
  _question_id uuid,
  _new_correct_answer jsonb,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
  v_test_centre_id uuid;
  v_old_correct_answer jsonb;
  v_attempt RECORD;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT test_id, correct_answer INTO v_test_id, v_old_correct_answer
  FROM public.test_questions WHERE id = _question_id;
  IF v_test_id IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;

  SELECT centre_id INTO v_test_centre_id FROM public.tests WHERE id = v_test_id;

  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR (v_test_centre_id IS NOT NULL AND public.has_permission(auth.uid(), 'test_platform', 'edit', v_test_centre_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this test''s questions';
  END IF;

  UPDATE public.test_questions
  SET correct_answer = _new_correct_answer
  WHERE id = _question_id;

  FOR v_attempt IN
    SELECT id FROM public.test_attempts
    WHERE test_id = v_test_id AND status IN ('submitted','auto_submitted')
  LOOP
    PERFORM public.score_test_attempt(v_attempt.id);
    v_count := v_count + 1;
  END LOOP;

  BEGIN
    PERFORM public.refresh_test_leaderboard(v_test_id);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  INSERT INTO public.test_question_answer_key_log
    (question_id, test_id, old_correct_answer, new_correct_answer, changed_by, reason, updated_attempts)
  VALUES
    (_question_id, v_test_id, v_old_correct_answer, _new_correct_answer, auth.uid(), _reason, v_count);

  RETURN jsonb_build_object('updated_attempts', v_count, 'test_id', v_test_id);
END;
$$;
