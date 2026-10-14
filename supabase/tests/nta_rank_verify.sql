DO $$
DECLARE
  bad_tests integer;
  missing_tests integer;
BEGIN
  -- every cached test has unique ranks 1..N
  SELECT count(*) INTO bad_tests FROM (
    SELECT c.test_id
    FROM public.test_leaderboard_cache c
    CROSS JOIN LATERAL jsonb_array_elements(c.ranks) e
    GROUP BY c.test_id
    HAVING count(*) <> count(DISTINCT e->>'rank')
        OR max((e->>'rank')::int) <> count(*)
  ) x;
  ASSERT bad_tests = 0, format('%s test(s) have duplicate or gapped ranks', bad_tests);

  -- every test with submitted attempts has a rebuilt cache
  SELECT count(*) INTO missing_tests FROM (
    SELECT DISTINCT ta.test_id FROM public.test_attempts ta
    JOIN public.tests t ON t.id = ta.test_id
    WHERE ta.status IN ('submitted','auto_submitted')
  ) a
  LEFT JOIN public.test_leaderboard_cache c ON c.test_id = a.test_id
  WHERE c.test_id IS NULL OR c.computed_at < now() - interval '1 day';
  ASSERT missing_tests = 0, format('%s test(s) have a missing or stale cache', missing_tests);
END $$;
