CREATE OR REPLACE FUNCTION public.admin_combined_result_ranks(_test_a uuid, _test_b uuid)
RETURNS TABLE(merge_key text, rank_p1 integer, rank_p2 integer, rank_combined integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT t.exam_pattern INTO v_pattern FROM public.tests t WHERE t.id = _test_a;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (ta.test_id, ta.user_id)
      ta.test_id, ta.user_id, ta.score, ta.submitted_at,
      COALESCE(ta.result -> 'subjects', ta.metadata -> 'subjects', '{}'::jsonb) AS subj
    FROM public.test_attempts ta
    WHERE ta.test_id IN (_test_a, _test_b)
      AND ta.status IN ('submitted', 'auto_submitted')
      AND NOT EXISTS (
        SELECT 1 FROM public.test_result_exclusions e
        WHERE e.test_id = ta.test_id AND e.user_id = ta.user_id
      )
    ORDER BY ta.test_id, ta.user_id, ta.submitted_at DESC NULLS LAST
  ),
  keyed AS (
    SELECT l.*,
      CASE WHEN p.roll_number IS NOT NULL AND btrim(p.roll_number) <> ''
           THEN 'R:' || btrim(p.roll_number)
           ELSE 'U:' || l.user_id::text END AS mkey
    FROM latest l
    LEFT JOIN public.profiles p ON p.user_id = l.user_id
  ),
  dedup AS (
    SELECT DISTINCT ON (k.test_id, k.mkey) k.*
    FROM keyed k
    ORDER BY k.test_id, k.mkey, k.submitted_at DESC NULLS LAST
  ),
  p1 AS (
    SELECT * FROM public.nta_rank(
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('key', d.mkey, 'score', COALESCE(d.score, 0), 'submitted_at', d.submitted_at, 'subjects', d.subj)), '[]'::jsonb)
       FROM dedup d WHERE d.test_id = _test_a),
      v_pattern)
  ),
  p2 AS (
    SELECT * FROM public.nta_rank(
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('key', d.mkey, 'score', COALESCE(d.score, 0), 'submitted_at', d.submitted_at, 'subjects', d.subj)), '[]'::jsonb)
       FROM dedup d WHERE d.test_id = _test_b),
      v_pattern)
  ),
  pc AS (
    SELECT * FROM public.nta_rank(
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('key', d.mkey, 'score', COALESCE(d.score, 0), 'submitted_at', d.submitted_at, 'subjects', d.subj)), '[]'::jsonb)
       FROM dedup d),
      v_pattern)
  ),
  keys AS (SELECT DISTINCT d.mkey FROM dedup d)
  SELECT k.mkey, p1.rank_num, p2.rank_num, pc.rank_num
  FROM keys k
  LEFT JOIN p1 ON p1.row_key = k.mkey
  LEFT JOIN p2 ON p2.row_key = k.mkey
  LEFT JOIN pc ON pc.row_key = k.mkey;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_combined_result_ranks(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_combined_result_ranks(uuid, uuid) TO authenticated;
