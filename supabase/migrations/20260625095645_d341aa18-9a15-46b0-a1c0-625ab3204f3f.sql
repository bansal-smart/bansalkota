
-- 1. Alumni submissions
DROP POLICY IF EXISTS "Public can view approved alumni submissions" ON public.alumni_submissions;

CREATE OR REPLACE VIEW public.public_alumni_submissions
WITH (security_invoker = true) AS
SELECT id, full_name, rank_label, exam, selection_year, batch_year,
       photo_url, story, current_position, company, college_joined,
       stream_taken, status, created_at
FROM public.alumni_submissions
WHERE status = 'approved';

CREATE POLICY "Public can view approved alumni submissions (safe cols)"
ON public.alumni_submissions FOR SELECT
USING (status = 'approved');

REVOKE SELECT ON public.alumni_submissions FROM anon, authenticated;
GRANT SELECT (id, full_name, rank_label, exam, selection_year, batch_year,
              photo_url, story, current_position, company, college_joined,
              stream_taken, status, created_at, updated_at)
  ON public.alumni_submissions TO anon, authenticated;
GRANT SELECT ON public.public_alumni_submissions TO anon, authenticated;
GRANT ALL ON public.alumni_submissions TO service_role;

-- 2. test_questions: hide answer columns from direct SELECT
REVOKE SELECT ON public.test_questions FROM anon, authenticated;
GRANT SELECT (
  id, test_id, position, subject, topic, sub_topic,
  question_text, question_image_url, question_type,
  options, option_images, match_left,
  marks_correct, marks_wrong, marks_unanswered, partial_marking,
  answer_format, difficulty, solution_image_url, stem_image_url,
  is_bonus, import_batch_id, source_filename, created_at
) ON public.test_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;

-- 3. chapter_quiz_questions: hide correct_index/explanation
REVOKE SELECT ON public.chapter_quiz_questions FROM anon, authenticated;
GRANT SELECT (id, quiz_id, position, question, options, created_at)
  ON public.chapter_quiz_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_quiz_questions TO authenticated;
GRANT ALL ON public.chapter_quiz_questions TO service_role;

-- 4. profiles: centre staff WITH CHECK locked-field protection
CREATE OR REPLACE FUNCTION public.get_profile_lock_fields(_user_id uuid)
RETURNS TABLE(centre_id uuid, school_id uuid, batch_id uuid,
              roll_number text, is_bansal_offline_student boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT centre_id, school_id, batch_id, roll_number, is_bansal_offline_student
  FROM public.profiles WHERE user_id = _user_id
$$;

DROP POLICY IF EXISTS "Centre staff can update their students" ON public.profiles;
CREATE POLICY "Centre staff can update their students"
ON public.profiles FOR UPDATE
USING (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id))
WITH CHECK (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
  AND NOT (centre_id IS DISTINCT FROM (SELECT f.centre_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (school_id IS DISTINCT FROM (SELECT f.school_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (batch_id IS DISTINCT FROM (SELECT f.batch_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (roll_number IS DISTINCT FROM (SELECT f.roll_number FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (is_bansal_offline_student IS DISTINCT FROM (SELECT f.is_bansal_offline_student FROM public.get_profile_lock_fields(profiles.user_id) f))
);

-- 5. live_classes: fix profiles.id -> profiles.user_id
DROP POLICY IF EXISTS "Centre students view centre live classes" ON public.live_classes;
CREATE POLICY "Centre students view centre live classes"
ON public.live_classes FOR SELECT
USING (
  centre_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.centre_id = live_classes.centre_id
  )
);
