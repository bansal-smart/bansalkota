CREATE OR REPLACE FUNCTION public.refresh_test_leaderboard(_test_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_topper numeric;
  v_avg numeric;
  v_ranks jsonb;
  v_pattern text;
BEGIN
  SELECT exam_pattern INTO v_pattern FROM public.tests WHERE id = _test_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (user_id) user_id, score, submitted_at, result, metadata
    FROM public.test_attempts
    WHERE test_id = _test_id
      AND status IN ('submitted','auto_submitted')
      AND user_id NOT IN (
        SELECT user_id FROM public.test_result_exclusions WHERE test_id = _test_id
      )
    ORDER BY user_id, submitted_at DESC NULLS LAST
  ),
  ranks AS (
    SELECT * FROM public.nta_rank(
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'key', x.user_id::text,
                'score', COALESCE(x.score, 0),
                'submitted_at', x.submitted_at,
                'subjects', COALESCE(x.result -> 'subjects', x.metadata -> 'subjects', '{}'::jsonb)
              )), '[]'::jsonb)
       FROM latest x),
      v_pattern
    )
  ),
  ranked AS (
    SELECT l.user_id, l.score, r.rank_num, r.percentile, COUNT(*) OVER () AS total
    FROM latest l
    JOIN ranks r ON r.row_key = l.user_id::text
  )
  SELECT
    COALESCE(MAX(total), 0),
    MAX(score),
    AVG(score),
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'score', score,
      'rank', rank_num,
      'percentile', percentile
    )), '[]'::jsonb)
  INTO v_total, v_topper, v_avg, v_ranks
  FROM ranked;

  INSERT INTO public.test_leaderboard_cache (test_id, computed_at, total_attempts, topper_score, average_score, ranks)
  VALUES (_test_id, now(), v_total, v_topper, v_avg, v_ranks)
  ON CONFLICT (test_id) DO UPDATE
    SET computed_at = EXCLUDED.computed_at,
        total_attempts = EXCLUDED.total_attempts,
        topper_score = EXCLUDED.topper_score,
        average_score = EXCLUDED.average_score,
        ranks = EXCLUDED.ranks;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_test_leaderboard(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_test_leaderboard(uuid) TO service_role;
