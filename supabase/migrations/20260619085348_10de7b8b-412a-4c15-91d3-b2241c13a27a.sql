-- Revoke EXECUTE FROM anon for internal SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    -- admin / staff RPCs
    'admin_emails_for_user_ids', 'admin_get_question_bank_full', 'admin_get_test_questions_full',
    'admin_reopen_attempt', 'admin_test_result_sheet', 'admin_toggle_result_exclusion',
    'admin_recompute_test_attempt', 'admin_set_user_role', 'lookup_user_id_by_email',
    -- student-auth RPCs
    'assign_doubt_to_teacher', 'can_reattempt_test',
    'get_chapter_quiz_answers', 'get_lesson_video_url', 'get_live_class_join_url',
    'get_test_question_answers', 'get_test_rank', 'get_user_streak',
    -- trigger functions
    'grant_center_admin_role', 'revoke_center_admin_role', 'handle_new_user',
    'ensure_it_testing_batch_on_test', 'protect_test_attempt_answers',
    'refresh_course_rating', 'sync_enrollment_progress', 'pick_teacher_for_doubt',
    'notify_admins', 'notify_alumni_submission', 'notify_boost_registration',
    'notify_course_published', 'notify_doubt_answer', 'notify_doubt_assigned',
    'notify_educator_application', 'notify_enquiry_submitted', 'notify_landing_lead',
    'notify_live_class_scheduled', 'notify_question_report', 'notify_report_created',
    'notify_report_status_change', 'notify_test_published', 'notify_test_support_query',
    'tg_refresh_leaderboard_after_submit'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    FOR r IN
      SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC', r.proname, r.args);
    END LOOP;
  END LOOP;
END $$;

-- Snapshot table: deny all client access (writes happen via SECURITY DEFINER trigger)
DROP POLICY IF EXISTS "snapshots_no_client_access" ON public.test_attempt_answer_snapshots;
CREATE POLICY "snapshots_no_client_access"
ON public.test_attempt_answer_snapshots
FOR ALL
USING (false)
WITH CHECK (false);

GRANT ALL ON public.test_attempt_answer_snapshots TO service_role;