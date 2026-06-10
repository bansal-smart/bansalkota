
-- Add publish/visibility toggles to chapters and lessons
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

-- Tighten public visibility: only show published chapters/lessons of published courses
DROP POLICY IF EXISTS "Anyone can view chapters of published courses" ON public.chapters;
CREATE POLICY "Anyone can view published chapters"
  ON public.chapters FOR SELECT
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = chapters.course_id AND c.is_published = true)
  );

DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;
CREATE POLICY "Anyone can view published lessons"
  ON public.lessons FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.chapters ch
      JOIN public.courses c ON c.id = ch.course_id
      WHERE ch.id = lessons.chapter_id AND ch.is_published = true AND c.is_published = true
    )
  );

-- Enable Realtime for admin sync on these tables
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.chapters REPLICA IDENTITY FULL;
ALTER TABLE public.lessons REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.courses; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
