
ALTER TABLE public.alumni_submissions
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS course_program text,
  ADD COLUMN IF NOT EXISTS selection_year text,
  ADD COLUMN IF NOT EXISTS college_joined text,
  ADD COLUMN IF NOT EXISTS stream_taken text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_registration_id integer,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS alumni_submissions_source_registration_id_uniq
  ON public.alumni_submissions(source_registration_id)
  WHERE source_registration_id IS NOT NULL;
