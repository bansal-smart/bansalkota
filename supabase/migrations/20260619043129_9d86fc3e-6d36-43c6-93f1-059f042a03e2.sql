-- 1. Extend toppers
ALTER TABLE public.toppers
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS story text;

-- 2. Alumni submissions table
CREATE TABLE IF NOT EXISTS public.alumni_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  batch_year integer,
  exam text,
  rank_label text,
  current_position text,
  company text,
  city text,
  story text NOT NULL,
  photo_url text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_topper_id uuid REFERENCES public.toppers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_submissions TO authenticated;
GRANT INSERT ON public.alumni_submissions TO anon;
GRANT ALL ON public.alumni_submissions TO service_role;

ALTER TABLE public.alumni_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit alumni story"
  ON public.alumni_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view alumni submissions"
  ON public.alumni_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update alumni submissions"
  ON public.alumni_submissions FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete alumni submissions"
  ON public.alumni_submissions FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER alumni_submissions_set_updated_at
  BEFORE UPDATE ON public.alumni_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS alumni_submissions_status_created_idx
  ON public.alumni_submissions (status, created_at DESC);

-- 3. Notify admins on new submission
CREATE OR REPLACE FUNCTION public.notify_alumni_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New alumni story: ' || NEW.full_name,
    COALESCE('Batch ' || NEW.batch_year::text || ' · ', '') ||
      COALESCE(NEW.current_position, '') ||
      COALESCE(' @ ' || NEW.company, ''),
    'alumni_submission',
    '/admin/alumni-submissions'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alumni_submissions_notify ON public.alumni_submissions;
CREATE TRIGGER alumni_submissions_notify
  AFTER INSERT ON public.alumni_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_alumni_submission();