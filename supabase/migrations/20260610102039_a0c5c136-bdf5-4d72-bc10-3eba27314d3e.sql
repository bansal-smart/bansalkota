
-- 1. Drop mentor + compete tables
DROP TABLE IF EXISTS public.mentor_announcement_rsvps CASCADE;
DROP TABLE IF EXISTS public.mentor_announcements CASCADE;
DROP TABLE IF EXISTS public.mentor_backup_pool CASCADE;
DROP TABLE IF EXISTS public.mentor_group_reads CASCADE;
DROP TABLE IF EXISTS public.mentor_group_members CASCADE;
DROP TABLE IF EXISTS public.mentor_groups CASCADE;
DROP TABLE IF EXISTS public.mentor_handovers CASCADE;
DROP TABLE IF EXISTS public.mentor_messages CASCADE;
DROP TABLE IF EXISTS public.mentor_reviews CASCADE;
DROP TABLE IF EXISTS public.mentor_student_assignments CASCADE;

DROP TABLE IF EXISTS public.compete_match_answers CASCADE;
DROP TABLE IF EXISTS public.compete_matches CASCADE;
DROP TABLE IF EXISTS public.compete_questions CASCADE;
DROP TABLE IF EXISTS public.compete_queue CASCADE;
DROP TABLE IF EXISTS public.compete_ratings CASCADE;

-- 2. Drop orphaned functions
DROP FUNCTION IF EXISTS public.notify_mentor_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_mentor_direct_message() CASCADE;
DROP FUNCTION IF EXISTS public.notify_mentor_announcement() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_mentor_group_membership() CASCADE;
DROP FUNCTION IF EXISTS public.remove_mentor_group_membership() CASCADE;
DROP FUNCTION IF EXISTS public.is_mentor_of_group(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_member_of_group(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_active_backup_for_student(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_active_backup_for_mentor(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_compete_question_answers(uuid) CASCADE;

-- 3. Clear mentor role assignments (enum value left in place; unused)
DELETE FROM public.user_roles WHERE role = 'mentor'::app_role;

-- 4. Lecture Bucket
CREATE TABLE public.lecture_bucket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  topic text,
  youtube_url text NOT NULL,
  duration_seconds integer DEFAULT 0,
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_bucket TO authenticated;
GRANT ALL ON public.lecture_bucket TO service_role;

ALTER TABLE public.lecture_bucket ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lecture bucket"
  ON public.lecture_bucket FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage lecture bucket"
  ON public.lecture_bucket FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER update_lecture_bucket_updated_at
  BEFORE UPDATE ON public.lecture_bucket
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lecture_bucket_subject ON public.lecture_bucket(subject);
CREATE INDEX idx_lecture_bucket_title ON public.lecture_bucket(title);

-- 5. Lessons link to bucket
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lecture_id uuid REFERENCES public.lecture_bucket(id) ON DELETE SET NULL;

-- 6. Single active banner
CREATE UNIQUE INDEX IF NOT EXISTS site_banners_single_active_idx
  ON public.site_banners ((is_active)) WHERE is_active = true;
