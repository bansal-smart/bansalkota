
ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS centre_online_course_id uuid REFERENCES public.centre_online_courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_live_classes_centre_online_course_id
  ON public.live_classes(centre_online_course_id);
