
-- Add topic_id and subtopic_label to content tables
ALTER TABLE public.subtopic_videos
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subtopic_label text;

ALTER TABLE public.subtopic_pdfs
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subtopic_label text;

ALTER TABLE public.subtopic_quizzes
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subtopic_label text;

-- Backfill topic_id and subtopic_label from existing subtopic relationships
UPDATE public.subtopic_videos v
SET topic_id = s.topic_id,
    subtopic_label = CASE
      WHEN s.name IS NULL OR btrim(s.name) IN ('', '.', '-', '—') THEN NULL
      ELSE s.name
    END
FROM public.course_subtopics s
WHERE v.subtopic_id = s.id AND v.topic_id IS NULL;

UPDATE public.subtopic_pdfs p
SET topic_id = s.topic_id,
    subtopic_label = CASE
      WHEN s.name IS NULL OR btrim(s.name) IN ('', '.', '-', '—') THEN NULL
      ELSE s.name
    END
FROM public.course_subtopics s
WHERE p.subtopic_id = s.id AND p.topic_id IS NULL;

UPDATE public.subtopic_quizzes q
SET topic_id = s.topic_id,
    subtopic_label = CASE
      WHEN s.name IS NULL OR btrim(s.name) IN ('', '.', '-', '—') THEN NULL
      ELSE s.name
    END
FROM public.course_subtopics s
WHERE q.subtopic_id = s.id AND q.topic_id IS NULL;

-- Make subtopic_id nullable (deprecated, kept for safety)
ALTER TABLE public.subtopic_videos ALTER COLUMN subtopic_id DROP NOT NULL;
ALTER TABLE public.subtopic_pdfs ALTER COLUMN subtopic_id DROP NOT NULL;
ALTER TABLE public.subtopic_quizzes ALTER COLUMN subtopic_id DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subtopic_videos_topic_id ON public.subtopic_videos(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopic_pdfs_topic_id ON public.subtopic_pdfs(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopic_quizzes_topic_id ON public.subtopic_quizzes(topic_id);
