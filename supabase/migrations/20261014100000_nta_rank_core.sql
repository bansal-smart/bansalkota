-- NTA-style ranking. See docs/superpowers/specs/2026-10-14-nta-rank-calculation-design.md.

CREATE OR REPLACE FUNCTION public.nta_norm_subject(_s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(btrim(_s))
    WHEN 'maths' THEN 'mathematics'
    WHEN 'math' THEN 'mathematics'
    WHEN 'botany' THEN 'biology'
    WHEN 'zoology' THEN 'biology'
    ELSE lower(btrim(_s))
  END
$$;

CREATE OR REPLACE FUNCTION public.nta_subject_order(_exam_pattern text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(_exam_pattern, '')) LIKE 'jee%' THEN ARRAY['mathematics','physics','chemistry']
    WHEN lower(COALESCE(_exam_pattern, '')) = 'neet'    THEN ARRAY['biology','chemistry','physics']
    ELSE ARRAY[]::text[]
  END
$$;

-- Wrong-to-correct ratio, lower is better. Nothing attempted -> 0 (best);
-- no correct answers but some wrong -> a huge value (worst).
CREATE OR REPLACE FUNCTION public.nta_wrong_ratio(_correct numeric, _attempted numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_correct, 0) <= 0 THEN
      CASE WHEN COALESCE(_attempted, 0) > 0 THEN 1000000000 ELSE 0 END
    ELSE (COALESCE(_attempted, 0) - _correct) / _correct
  END
$$;

CREATE OR REPLACE FUNCTION public.nta_rank(_rows jsonb, _exam_pattern text)
RETURNS TABLE(row_key text, rank_num integer, percentile numeric)
LANGUAGE sql
STABLE
AS $$
  WITH ord AS (
    SELECT public.nta_subject_order(_exam_pattern) AS o
  ),
  src AS (
    SELECT r FROM jsonb_array_elements(COALESCE(_rows, '[]'::jsonb)) r
  ),
  base AS (
    SELECT r->>'key' AS k,
           SUM(COALESCE((r->>'score')::numeric, 0)) AS score,
           MAX((r->>'submitted_at')::timestamptz) AS submitted_at
    FROM src
    GROUP BY r->>'key'
  ),
  subj AS (
    SELECT src.r->>'key' AS k,
           public.nta_norm_subject(s.key) AS subject,
           CASE jsonb_typeof(s.value)
             WHEN 'object' THEN COALESCE((s.value->>'score')::numeric, 0)
             WHEN 'number' THEN (s.value #>> '{}')::numeric
             ELSE 0 END AS score,
           CASE WHEN jsonb_typeof(s.value) = 'object' THEN COALESCE((s.value->>'correct')::numeric, 0) ELSE 0 END AS correct,
           CASE WHEN jsonb_typeof(s.value) = 'object' THEN COALESCE((s.value->>'attempted')::numeric, 0) ELSE 0 END AS attempted
    FROM src
    CROSS JOIN LATERAL jsonb_each(
      CASE WHEN jsonb_typeof(src.r->'subjects') = 'object' THEN src.r->'subjects' ELSE '{}'::jsonb END
    ) s
  ),
  agg AS (
    SELECT k, subject, SUM(score) AS score, SUM(correct) AS correct, SUM(attempted) AS attempted
    FROM subj
    GROUP BY k, subject
  ),
  totals AS (
    SELECT k, SUM(correct) AS correct, SUM(attempted) AS attempted
    FROM agg
    GROUP BY k
  ),
  per AS (
    SELECT b.k, b.score, b.submitted_at,
           COALESCE(a1.score, 0) AS s1, COALESCE(a2.score, 0) AS s2, COALESCE(a3.score, 0) AS s3,
           public.nta_wrong_ratio(t.correct, t.attempted) AS r_all,
           public.nta_wrong_ratio(a1.correct, a1.attempted) AS r1,
           public.nta_wrong_ratio(a2.correct, a2.attempted) AS r2,
           public.nta_wrong_ratio(a3.correct, a3.attempted) AS r3
    FROM base b
    LEFT JOIN totals t ON t.k = b.k
    LEFT JOIN agg a1 ON a1.k = b.k AND a1.subject = (SELECT o[1] FROM ord)
    LEFT JOIN agg a2 ON a2.k = b.k AND a2.subject = (SELECT o[2] FROM ord)
    LEFT JOIN agg a3 ON a3.k = b.k AND a3.subject = (SELECT o[3] FROM ord)
  ),
  ranked AS (
    SELECT k, score,
           ROW_NUMBER() OVER (
             ORDER BY score DESC, s1 DESC, s2 DESC, s3 DESC,
                      r_all ASC, r1 ASC, r2 ASC, r3 ASC,
                      submitted_at ASC NULLS LAST, k ASC
           ) AS rn,
           COUNT(*) OVER (ORDER BY score) AS m,
           COUNT(*) OVER () AS n
    FROM per
  )
  SELECT k, rn::integer, ROUND(100.0 * m / n, 1)
  FROM ranked
$$;

REVOKE EXECUTE ON FUNCTION public.nta_rank(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nta_rank(jsonb, text) TO authenticated, service_role;
