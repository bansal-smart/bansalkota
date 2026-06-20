
CREATE OR REPLACE FUNCTION public.admin_test_result_sheet(_test_id uuid)
 RETURNS TABLE(user_id uuid, roll_number text, full_name text, batch_id uuid, batch_name text, batch_code text, subjects jsonb, total_score numeric, percentage numeric, rank_label text, rank_num integer, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_test RECORD;
  v_total_marks numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (
    public.is_admin_or_super(auth.uid())
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'center_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_test FROM public.tests t WHERE t.id = _test_id;
  IF v_test IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;

  v_total_marks := COALESCE(NULLIF(v_test.total_marks, 0), 1);

  RETURN QUERY
  WITH
  excluded_users AS (
    SELECT tre.user_id AS uid FROM public.test_result_exclusions tre WHERE tre.test_id = _test_id
  ),
  attempts AS (
    SELECT DISTINCT ON (ta.user_id)
      ta.user_id AS uid, ta.score, ta.metadata
    FROM public.test_attempts ta
    WHERE ta.test_id = _test_id
      AND ta.status IN ('submitted', 'auto_submitted')
      AND ta.user_id NOT IN (SELECT eu.uid FROM excluded_users eu)
    ORDER BY ta.user_id, ta.submitted_at DESC NULLS LAST
  ),
  audience AS (
    SELECT p.user_id AS uid
    FROM public.profiles p
    WHERE p.user_id NOT IN (SELECT eu.uid FROM excluded_users eu)
      AND (
        v_test.cbt_allowed_batch_ids IS NOT NULL
        AND array_length(v_test.cbt_allowed_batch_ids, 1) > 0
        AND p.batch_id = ANY(v_test.cbt_allowed_batch_ids)
      )
    UNION
    SELECT e.user_id AS uid
    FROM public.enrollments e
    WHERE v_test.course_id IS NOT NULL
      AND e.course_id = v_test.course_id AND e.is_active = true
      AND e.user_id NOT IN (SELECT eu.uid FROM excluded_users eu)
    UNION
    SELECT a.uid FROM attempts a
  ),
  joined AS (
    SELECT p.user_id AS uid, p.roll_number, p.full_name, p.batch_id AS bid,
           cb.name AS batch_name, cb.code AS batch_code,
           a.score, a.metadata, (a.uid IS NOT NULL) AS is_present
    FROM audience aud
    JOIN public.profiles p ON p.user_id = aud.uid
    LEFT JOIN public.course_batches cb ON cb.id = p.batch_id
    LEFT JOIN attempts a ON a.uid = p.user_id
  ),
  with_subjects AS (
    SELECT j.*,
      CASE WHEN j.is_present AND jsonb_typeof(j.metadata -> 'subjects') = 'object' THEN (
        SELECT jsonb_object_agg(
          s.key,
          CASE
            WHEN jsonb_typeof(s.value) = 'object' THEN COALESCE((s.value ->> 'score')::numeric, 0)
            WHEN jsonb_typeof(s.value) = 'number' THEN (s.value)::text::numeric
            ELSE COALESCE(NULLIF(s.value #>> '{}', '')::numeric, 0)
          END
        )
        FROM jsonb_each(j.metadata -> 'subjects') s
      ) ELSE NULL END AS subj_obj
    FROM joined j
  ),
  ranked AS (
    SELECT w.*,
      CASE WHEN w.is_present THEN ROUND(COALESCE(w.score, 0) * 100.0 / v_total_marks, 2) ELSE NULL END AS pct,
      CASE WHEN w.is_present THEN RANK() OVER (
        PARTITION BY (CASE WHEN w.is_present THEN 1 ELSE 0 END)
        ORDER BY COALESCE(w.score, 0) DESC
      ) ELSE NULL END AS r_num
    FROM with_subjects w
  )
  SELECT r.uid, r.roll_number, r.full_name, r.bid, r.batch_name, r.batch_code,
         COALESCE(r.subj_obj, '{}'::jsonb),
         CASE WHEN r.is_present THEN COALESCE(r.score, 0) ELSE NULL END,
         r.pct,
         CASE WHEN r.is_present THEN r.r_num::text ELSE 'ABS' END,
         r.r_num::int,
         CASE WHEN r.is_present THEN 'present' ELSE 'absent' END
  FROM ranked r
  ORDER BY
    CASE WHEN r.is_present THEN 0 ELSE 1 END,
    COALESCE(r.score, -999999) DESC,
    r.roll_number NULLS LAST,
    r.full_name NULLS LAST;
END;
$function$;
