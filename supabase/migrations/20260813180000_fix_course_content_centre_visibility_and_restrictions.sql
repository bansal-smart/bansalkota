-- Fix course content visibility for Centre Staff & restrict editing on Super Admin courses.
--
-- Problem 1: `read_subjects`, `read_topics`, `read_subtopics`, `read_videos`, `read_pdfs`,
-- `read_quizzes`, `read_quiz_questions` RLS policies only allowed admin, super_admin, teacher,
-- or enrolled students. Centre-level admins (is_any_centre_staff) were denied SELECT, causing
-- 0 subjects/videos to render when Centre Admins opened the Course Content tab.
--
-- Problem 2: Write policies (write_subjects, write_topics, write_subtopics, write_videos,
-- write_pdfs, write_quizzes, write_quiz_questions) must restrict Centre-level Admins from
-- modifying content for courses uploaded by Super Admin (is_global = true or centre_id IS NULL).
-- Centre staff can only write/edit content for courses belonging to their own centre.

-- 1. READ POLICIES (Allow Super Admin, Admin, Centre Staff, and Enrolled Students)

DROP POLICY IF EXISTS "read_subjects" ON public.course_subjects;
CREATE POLICY "read_subjects" ON public.course_subjects FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_subjects.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_topics" ON public.course_topics;
CREATE POLICY "read_topics" ON public.course_topics FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_topics.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_subtopics" ON public.course_subtopics;
CREATE POLICY "read_subtopics" ON public.course_subtopics FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_subtopics.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_videos" ON public.subtopic_videos;
CREATE POLICY "read_videos" ON public.subtopic_videos FOR SELECT
  USING (
    is_preview = true
    OR public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_videos.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_pdfs" ON public.subtopic_pdfs;
CREATE POLICY "read_pdfs" ON public.subtopic_pdfs FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_pdfs.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_quizzes" ON public.subtopic_quizzes;
CREATE POLICY "read_quizzes" ON public.subtopic_quizzes FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = subtopic_quizzes.course_id AND e.user_id = auth.uid() AND e.is_active = true)
  );

DROP POLICY IF EXISTS "read_quiz_questions" ON public.subtopic_quiz_questions;
CREATE POLICY "read_quiz_questions" ON public.subtopic_quiz_questions FOR SELECT
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_any_centre_staff(auth.uid())
    OR public.has_permission(auth.uid(), 'courses', 'view')
    OR EXISTS (
      SELECT 1 FROM public.subtopic_quizzes q
      JOIN public.enrollments e ON e.course_id = q.course_id AND e.user_id = auth.uid() AND e.is_active = true
      WHERE q.id = subtopic_quiz_questions.quiz_id
    )
  );


-- 2. WRITE POLICIES (Super Admins can write all; Centre Staff can ONLY write for courses belonging to their centre AND not global)

DROP POLICY IF EXISTS "write_subjects" ON public.course_subjects;
CREATE POLICY "write_subjects" ON public.course_subjects FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_subjects.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_subjects.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_topics" ON public.course_topics;
CREATE POLICY "write_topics" ON public.course_topics FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_topics.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_topics.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_subtopics" ON public.course_subtopics;
CREATE POLICY "write_subtopics" ON public.course_subtopics FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_subtopics.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_subtopics.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_videos" ON public.subtopic_videos;
CREATE POLICY "write_videos" ON public.subtopic_videos FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_videos.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_videos.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_pdfs" ON public.subtopic_pdfs;
CREATE POLICY "write_pdfs" ON public.subtopic_pdfs FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_pdfs.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_pdfs.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_quizzes" ON public.subtopic_quizzes;
CREATE POLICY "write_quizzes" ON public.subtopic_quizzes FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_quizzes.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = subtopic_quizzes.course_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );

DROP POLICY IF EXISTS "write_quiz_questions" ON public.subtopic_quiz_questions;
CREATE POLICY "write_quiz_questions" ON public.subtopic_quiz_questions FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.subtopic_quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = subtopic_quiz_questions.quiz_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.subtopic_quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = subtopic_quiz_questions.quiz_id
        AND c.centre_id IS NOT NULL
        AND c.is_global = false
        AND public.has_permission(auth.uid(), 'courses', 'edit', c.centre_id)
    )
  );
