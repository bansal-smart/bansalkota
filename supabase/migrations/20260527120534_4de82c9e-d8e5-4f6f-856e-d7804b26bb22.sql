
GRANT SELECT (correct_index, explanation) ON public.chapter_quiz_questions TO authenticated;
GRANT SELECT (correct_answer, explanation) ON public.test_questions TO authenticated;
GRANT SELECT (correct_index, explanation) ON public.compete_questions TO authenticated;
GRANT SELECT (file_url) ON public.course_resources TO authenticated;
