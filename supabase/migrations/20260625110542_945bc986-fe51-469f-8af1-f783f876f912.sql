ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS duration_label text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS subjects_covered text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS included_services text[] DEFAULT '{}'::text[];