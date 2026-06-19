-- course_resources: require enrollment OR staff for SELECT
DROP POLICY IF EXISTS "Authenticated can view published resource metadata" ON public.course_resources;

CREATE POLICY "Enrolled or staff can view published resource metadata"
ON public.course_resources
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_resources.course_id
        AND e.user_id = auth.uid()
        AND e.is_active = true
    )
  )
);

-- chapter_quiz_questions: hide answer columns from clients
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM anon;
REVOKE SELECT (correct_index, explanation) ON public.chapter_quiz_questions FROM authenticated;

-- test_questions: hide answer columns from clients
REVOKE SELECT (correct_answer, numerical_answer, explanation)
  ON public.test_questions FROM anon;
REVOKE SELECT (correct_answer, numerical_answer, explanation)
  ON public.test_questions FROM authenticated;

-- Staff/owner-only RPC that returns the hidden columns for the editor UI
CREATE OR REPLACE FUNCTION public.admin_get_test_questions_full(_test_id uuid)
RETURNS TABLE (
  id uuid,
  correct_answer jsonb,
  numerical_answer numeric,
  explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = _test_id
        AND t.created_by = auth.uid()
        AND public.has_role(auth.uid(), 'teacher'::app_role)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_answer::jsonb, q.numerical_answer, q.explanation
  FROM public.test_questions q
  WHERE q.test_id = _test_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_test_questions_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_test_questions_full(uuid) TO authenticated;

-- lessons.video_url: revoke direct anon access; gate via RPC
REVOKE SELECT (video_url) ON public.lessons FROM anon;

CREATE OR REPLACE FUNCTION public.get_lesson_video_url(_lesson_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_course uuid;
  v_free boolean;
  v_published boolean;
BEGIN
  SELECT l.video_url, l.course_id, l.is_free_preview,
         (l.is_published AND ch.is_published AND c.is_published)
    INTO v_url, v_course, v_free, v_published
  FROM public.lessons l
  JOIN public.chapters ch ON ch.id = l.chapter_id
  JOIN public.courses c ON c.id = ch.course_id
  WHERE l.id = _lesson_id;

  IF v_url IS NULL OR v_published IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  IF v_free = true THEN
    RETURN v_url;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.has_role(auth.uid(), 'teacher'::app_role)
     OR EXISTS (
       SELECT 1 FROM public.enrollments e
       WHERE e.course_id = v_course
         AND e.user_id = auth.uid()
         AND e.is_active = true
     )
  THEN
    RETURN v_url;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_video_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_video_url(uuid) TO anon, authenticated;