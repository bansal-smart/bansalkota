
-- Add subject tag to chapters (optional, for subject-first study flow)
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS subject text;

-- Chapter quizzes
CREATE TABLE IF NOT EXISTS public.chapter_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chapter_quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_quizzes TO authenticated;
GRANT ALL ON public.chapter_quizzes TO service_role;

ALTER TABLE public.chapter_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published quizzes of published courses"
ON public.chapter_quizzes FOR SELECT TO anon, authenticated
USING (is_published = true AND EXISTS (
  SELECT 1 FROM public.courses c WHERE c.id = chapter_quizzes.course_id AND c.is_published = true
));

CREATE POLICY "Staff manage all chapter quizzes"
ON public.chapter_quizzes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Quiz questions
CREATE TABLE IF NOT EXISTS public.chapter_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.chapter_quizzes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  explanation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chapter_quiz_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_quiz_questions TO authenticated;
GRANT ALL ON public.chapter_quiz_questions TO service_role;

ALTER TABLE public.chapter_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View questions of viewable quizzes"
ON public.chapter_quiz_questions FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.chapter_quizzes q
  JOIN public.courses c ON c.id = q.course_id
  WHERE q.id = chapter_quiz_questions.quiz_id AND q.is_published = true AND c.is_published = true
));

CREATE POLICY "Staff manage all chapter quiz questions"
ON public.chapter_quiz_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Attempts
CREATE TABLE IF NOT EXISTS public.chapter_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.chapter_quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_quiz_attempts TO authenticated;
GRANT ALL ON public.chapter_quiz_attempts TO service_role;

ALTER TABLE public.chapter_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz attempts"
ON public.chapter_quiz_attempts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff view all quiz attempts"
ON public.chapter_quiz_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
