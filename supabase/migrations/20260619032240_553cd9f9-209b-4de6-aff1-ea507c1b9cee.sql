DO $$ BEGIN
  CREATE TYPE public.student_status AS ENUM ('active','inactive','passed_out','dropped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_status public.student_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_student_status ON public.profiles (student_status);
CREATE INDEX IF NOT EXISTS idx_profiles_center_id ON public.profiles (center_id);