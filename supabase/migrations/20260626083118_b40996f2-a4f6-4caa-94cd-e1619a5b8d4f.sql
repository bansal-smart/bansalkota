ALTER TABLE public.centres
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS students_mentored text,
  ADD COLUMN IF NOT EXISTS students_mentored_note text,
  ADD COLUMN IF NOT EXISTS selections_count text,
  ADD COLUMN IF NOT EXISTS selections_year integer,
  ADD COLUMN IF NOT EXISTS selections_note text;