-- Rebuild every leaderboard cache so existing results use the NTA-style ranks.
DO $$
DECLARE
  t uuid;
BEGIN
  FOR t IN
    SELECT DISTINCT test_id FROM public.test_attempts
    WHERE status IN ('submitted', 'auto_submitted') AND test_id IS NOT NULL
  LOOP
    PERFORM public.refresh_test_leaderboard(t);
  END LOOP;
END $$;
