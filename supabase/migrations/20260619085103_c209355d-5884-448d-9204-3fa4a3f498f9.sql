CREATE TABLE IF NOT EXISTS public.test_leaderboard_cache (
  test_id uuid PRIMARY KEY REFERENCES public.tests(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  total_attempts integer NOT NULL DEFAULT 0,
  topper_score numeric,
  average_score numeric,
  ranks jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT ALL ON public.test_leaderboard_cache TO service_role;
ALTER TABLE public.test_leaderboard_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leaderboard_cache_no_client_access" ON public.test_leaderboard_cache;
CREATE POLICY "leaderboard_cache_no_client_access"
ON public.test_leaderboard_cache FOR SELECT
USING (false);

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
BEGIN
  -- Silently skip if the test was deleted
  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE id = _test_id) THEN
    RETURN;
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (user_id) user_id, score
    FROM public.test_attempts
    WHERE test_id = _test_id
      AND status IN ('submitted','auto_submitted')
      AND user_id NOT IN (
        SELECT user_id FROM public.test_result_exclusions WHERE test_id = _test_id
      )
    ORDER BY user_id, submitted_at DESC NULLS LAST
  ),
  ranked AS (
    SELECT user_id, score,
           RANK() OVER (ORDER BY score DESC) AS rnk,
           COUNT(*) OVER () AS total
    FROM latest
  )
  SELECT
    COALESCE(MAX(total), 0),
    MAX(score),
    AVG(score),
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'score', score,
      'rank', rnk,
      'percentile', CASE WHEN total <= 1 THEN 100
                         ELSE ROUND((total - rnk)::numeric * 100.0 / total, 1) END
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

CREATE OR REPLACE FUNCTION public.tg_refresh_leaderboard_after_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('submitted','auto_submitted')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.refresh_test_leaderboard(NEW.test_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_leaderboard_after_submit ON public.test_attempts;
CREATE TRIGGER trg_refresh_leaderboard_after_submit
AFTER INSERT OR UPDATE OF status ON public.test_attempts
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_leaderboard_after_submit();

CREATE OR REPLACE FUNCTION public.get_test_rank(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_released boolean;
  v_excluded boolean;
  v_cache RECORD;
  v_compare_score numeric;
  v_self jsonb;
BEGIN
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF v_attempt.user_id <> auth.uid()
     AND NOT public.is_admin_or_super(auth.uid())
     AND NOT public.has_role(auth.uid(),'teacher'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.test_result_exclusions
    WHERE test_id = v_attempt.test_id AND user_id = v_attempt.user_id
  ) INTO v_excluded;

  SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;
  v_released := public.test_results_released(v_attempt.test_id);

  IF v_excluded THEN
    RETURN jsonb_build_object('excluded', true, 'released', v_released, 'your_score', v_attempt.score);
  END IF;

  IF NOT v_released THEN
    RETURN jsonb_build_object('released', false, 'release_at', v_test.ends_at, 'your_score', v_attempt.score);
  END IF;

  SELECT * INTO v_cache FROM public.test_leaderboard_cache WHERE test_id = v_attempt.test_id;
  IF v_cache IS NULL OR v_cache.computed_at < now() - interval '30 seconds' THEN
    PERFORM public.refresh_test_leaderboard(v_attempt.test_id);
    SELECT * INTO v_cache FROM public.test_leaderboard_cache WHERE test_id = v_attempt.test_id;
  END IF;

  SELECT r INTO v_self
  FROM jsonb_array_elements(COALESCE(v_cache.ranks, '[]'::jsonb)) r
  WHERE (r->>'user_id')::uuid = v_attempt.user_id
  LIMIT 1;

  v_compare_score := COALESCE((v_self->>'score')::numeric, v_attempt.score);

  RETURN jsonb_build_object(
    'released', true,
    'excluded', false,
    'rank', COALESCE((v_self->>'rank')::int, NULL),
    'total', COALESCE(v_cache.total_attempts, 0),
    'percentile', COALESCE((v_self->>'percentile')::numeric, NULL),
    'your_score', v_compare_score,
    'topper_score', v_cache.topper_score,
    'average_score', ROUND(COALESCE(v_cache.average_score, 0)::numeric, 2)
  );
END;
$$;

-- Backfill, skipping orphans
DO $$
DECLARE t uuid;
BEGIN
  FOR t IN
    SELECT DISTINCT ta.test_id
    FROM public.test_attempts ta
    JOIN public.tests tt ON tt.id = ta.test_id
    WHERE ta.status IN ('submitted','auto_submitted')
  LOOP
    PERFORM public.refresh_test_leaderboard(t);
  END LOOP;
END $$;