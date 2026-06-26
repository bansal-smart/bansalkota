
-- Hierarchy tables
CREATE TABLE public.course_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_subjects_course ON public.course_subjects(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_subjects TO authenticated;
GRANT ALL ON public.course_subjects TO service_role;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.course_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_topics_subject ON public.course_topics(subject_id);
CREATE INDEX idx_course_topics_course ON public.course_topics(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_topics TO authenticated;
GRANT ALL ON public.course_topics TO service_role;
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.course_topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_subtopics_topic ON public.course_subtopics(topic_id);
CREATE INDEX idx_course_subtopics_course ON public.course_subtopics(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_subtopics TO authenticated;
GRANT ALL ON public.course_subtopics TO service_role;
ALTER TABLE public.course_subtopics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES public.course_subtopics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration_label TEXT,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subtopic_videos_subtopic ON public.subtopic_videos(subtopic_id);
CREATE INDEX idx_subtopic_videos_course ON public.subtopic_videos(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_videos TO authenticated;
GRANT ALL ON public.subtopic_videos TO service_role;
ALTER TABLE public.subtopic_videos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES public.course_subtopics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_kb INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subtopic_pdfs_subtopic ON public.subtopic_pdfs(subtopic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_pdfs TO authenticated;
GRANT ALL ON public.subtopic_pdfs TO service_role;
ALTER TABLE public.subtopic_pdfs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL UNIQUE REFERENCES public.course_subtopics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  pass_percentage INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_quizzes TO authenticated;
GRANT ALL ON public.subtopic_quizzes TO service_role;
ALTER TABLE public.subtopic_quizzes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.subtopic_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  explanation TEXT,
  marks INTEGER NOT NULL DEFAULT 4,
  negative_marks NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_subtopic_quiz_questions_quiz ON public.subtopic_quiz_questions(quiz_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_quiz_questions TO authenticated;
GRANT ALL ON public.subtopic_quiz_questions TO service_role;
ALTER TABLE public.subtopic_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.subtopic_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  subtopic_id UUID REFERENCES public.course_subtopics(id) ON DELETE SET NULL,
  answers JSONB,
  score INTEGER,
  total_marks INTEGER,
  passed BOOLEAN,
  time_taken_seconds INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subtopic_quiz_attempts_user ON public.subtopic_quiz_attempts(user_id, quiz_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_quiz_attempts TO authenticated;
GRANT ALL ON public.subtopic_quiz_attempts TO service_role;
ALTER TABLE public.subtopic_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.subtopic_videos(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.course_subtopics(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
CREATE INDEX idx_video_progress_user_course ON public.subtopic_video_progress(user_id, course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_video_progress TO authenticated;
GRANT ALL ON public.subtopic_video_progress TO service_role;
ALTER TABLE public.subtopic_video_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtopic_video_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.subtopic_videos(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.course_subtopics(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
CREATE INDEX idx_video_notes_user ON public.subtopic_video_notes(user_id, video_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopic_video_notes TO authenticated;
GRANT ALL ON public.subtopic_video_notes TO service_role;
ALTER TABLE public.subtopic_video_notes ENABLE ROW LEVEL SECURITY;

-- course_resources extension
ALTER TABLE public.course_resources ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES public.course_subtopics(id) ON DELETE CASCADE;

-- updated_at triggers
CREATE TRIGGER tg_course_subjects_updated BEFORE UPDATE ON public.course_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_course_topics_updated BEFORE UPDATE ON public.course_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_course_subtopics_updated BEFORE UPDATE ON public.course_subtopics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_subtopic_video_notes_updated BEFORE UPDATE ON public.subtopic_video_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: staff check
-- Reuse has_role(...). Build policies inline.

-- Content READ policies (enrolled OR staff)
CREATE POLICY "read_subjects" ON public.course_subjects FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_subjects.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_subjects" ON public.course_subjects FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_topics" ON public.course_topics FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_topics.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_topics" ON public.course_topics FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_subtopics" ON public.course_subtopics FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_subtopics.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_subtopics" ON public.course_subtopics FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_videos" ON public.subtopic_videos FOR SELECT
  USING (
    is_preview = true
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_videos.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_videos" ON public.subtopic_videos FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_pdfs" ON public.subtopic_pdfs FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_pdfs.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_pdfs" ON public.subtopic_pdfs FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_quizzes" ON public.subtopic_quizzes FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_quizzes.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );
CREATE POLICY "write_quizzes" ON public.subtopic_quizzes FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "read_quiz_questions" ON public.subtopic_quiz_questions FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.has_role(auth.uid(),'teacher'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subtopic_quizzes q
      JOIN public.enrollments e ON e.course_id = q.course_id AND e.user_id = auth.uid() AND e.is_active = true
      WHERE q.id = subtopic_quiz_questions.quiz_id
    )
  );
CREATE POLICY "write_quiz_questions" ON public.subtopic_quiz_questions FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

-- User-owned tables
CREATE POLICY "own_quiz_attempts" ON public.subtopic_quiz_attempts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff_read_quiz_attempts" ON public.subtopic_quiz_attempts FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "own_video_progress" ON public.subtopic_video_progress FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_video_notes" ON public.subtopic_video_notes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
