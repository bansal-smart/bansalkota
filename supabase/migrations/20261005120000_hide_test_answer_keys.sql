-- Answer keys (correct answer, numerical answer, explanation, tolerance, range,
-- solution image) were readable by every logged-in user through direct table
-- SELECT, including a student taking the test. Hide them from direct reads;
-- staff read them through admin_get_test_questions_full, and students get them
-- only through get_test_question_answers / get_attempt_response_sheet, which
-- already gate on a submitted attempt or a staff role.

REVOKE SELECT ON public.test_questions FROM anon, authenticated;
GRANT SELECT (
  id, test_id, position, subject, topic, sub_topic,
  question_text, question_image_url, question_type,
  options, option_images, match_left,
  marks_correct, marks_wrong, marks_unanswered, partial_marking,
  answer_format, difficulty, stem_image_url,
  is_bonus, import_batch_id, source_filename, created_at
) ON public.test_questions TO authenticated;

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
  solution_image_url text
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
         q.tolerance, q.answer_range_min, q.answer_range_max, q.solution_image_url
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_test_questions_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_test_questions_full(uuid) TO authenticated;
