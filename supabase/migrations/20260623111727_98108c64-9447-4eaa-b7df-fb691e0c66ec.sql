
-- Centre-scoped online courses, chapters, lectures
CREATE TABLE public.centre_online_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  description text,
  thumbnail_url text,
  subject text,
  target_exam text,
  class_level text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_centre_online_courses_centre ON public.centre_online_courses(centre_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_online_courses TO authenticated;
GRANT ALL ON public.centre_online_courses TO service_role;
ALTER TABLE public.centre_online_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published centre online courses"
  ON public.centre_online_courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Centre staff manage own centre online courses"
  ON public.centre_online_courses FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_centre_staff(auth.uid(), centre_id)
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.is_centre_staff(auth.uid(), centre_id)
  );

CREATE TRIGGER update_centre_online_courses_updated_at
  BEFORE UPDATE ON public.centre_online_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.centre_online_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_course_id uuid NOT NULL REFERENCES public.centre_online_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_centre_online_chapters_course ON public.centre_online_chapters(centre_course_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_online_chapters TO authenticated;
GRANT ALL ON public.centre_online_chapters TO service_role;
ALTER TABLE public.centre_online_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view published centre chapters"
  ON public.centre_online_chapters FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.centre_online_courses c
      WHERE c.id = centre_online_chapters.centre_course_id AND c.is_published = true
    )
  );

CREATE POLICY "Centre staff manage own centre chapters"
  ON public.centre_online_chapters FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_online_courses c
      WHERE c.id = centre_online_chapters.centre_course_id
        AND public.is_centre_staff(auth.uid(), c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_online_courses c
      WHERE c.id = centre_online_chapters.centre_course_id
        AND public.is_centre_staff(auth.uid(), c.centre_id)
    )
  );

CREATE TRIGGER update_centre_online_chapters_updated_at
  BEFORE UPDATE ON public.centre_online_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.centre_online_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_course_id uuid NOT NULL REFERENCES public.centre_online_courses(id) ON DELETE CASCADE,
  centre_chapter_id uuid NOT NULL REFERENCES public.centre_online_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text,
  video_url text,
  youtube_id text,
  duration_seconds integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  is_free_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_centre_online_lessons_chapter ON public.centre_online_lessons(centre_chapter_id, position);
CREATE INDEX idx_centre_online_lessons_course ON public.centre_online_lessons(centre_course_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_online_lessons TO authenticated;
GRANT ALL ON public.centre_online_lessons TO service_role;
ALTER TABLE public.centre_online_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view published centre lessons"
  ON public.centre_online_lessons FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.centre_online_chapters ch
      JOIN public.centre_online_courses c ON c.id = ch.centre_course_id
      WHERE ch.id = centre_online_lessons.centre_chapter_id
        AND ch.is_published = true AND c.is_published = true
    )
  );

CREATE POLICY "Centre staff manage own centre lessons"
  ON public.centre_online_lessons FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_online_courses c
      WHERE c.id = centre_online_lessons.centre_course_id
        AND public.is_centre_staff(auth.uid(), c.centre_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_online_courses c
      WHERE c.id = centre_online_lessons.centre_course_id
        AND public.is_centre_staff(auth.uid(), c.centre_id)
    )
  );

CREATE TRIGGER update_centre_online_lessons_updated_at
  BEFORE UPDATE ON public.centre_online_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
