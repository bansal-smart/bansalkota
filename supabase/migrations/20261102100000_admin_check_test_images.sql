-- Health check: for each given test, count the question images (inline <img> in
-- question/option text, option_images, question/stem image urls) whose file no
-- longer exists in the private `question-images` bucket.
--
-- Background (Nov 1 2026): duplicating a test copies image URLs verbatim, and the
-- replace-import used to delete the "old" files from storage, silently breaking
-- every test that still pointed at them — including a live exam. This lets the
-- admin UI warn BEFORE students start a broken test.
--
-- Read-only. Admins see any test; centre staff only tests owned by their centre.
-- Full percent-decoding (storage.objects.name holds the decoded name).
CREATE OR REPLACE FUNCTION public._pct_decode(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT convert_from(
    COALESCE(string_agg(
      CASE WHEN m.a[1] ~ '^%[0-9A-Fa-f]{2}$' THEN decode(substr(m.a[1], 2), 'hex')
           ELSE convert_to(m.a[1], 'UTF8') END,
      ''::bytea ORDER BY m.ord), ''::bytea),
    'UTF8')
  FROM regexp_matches(t, '(%[0-9A-Fa-f]{2}|[^%]+|%)', 'g') WITH ORDINALITY AS m(a, ord)
$f$;

CREATE OR REPLACE FUNCTION public.admin_check_test_images(_test_ids uuid[])
RETURNS TABLE (test_id uuid, total_refs integer, missing_refs integer, broken_questions integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  WITH allowed AS (
    SELECT t.id
    FROM public.tests t
    WHERE t.id = ANY (_test_ids)
      AND (
        public.is_admin_or_super(auth.uid())
        OR (t.centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), t.centre_id))
      )
  ),
  refs AS (
    SELECT q.test_id, q.id AS qid,
      (regexp_matches(
        concat_ws(' ', q.question_text, q.options::text, q.option_images::text, q.question_image_url, q.stem_image_url,
                  q.solution_image_url, q.explanation, q.match_left::text),
        'object/(?:sign|public|authenticated)/question-images/([^?"'' \\)<>]+)', 'g'))[1] AS path
    FROM public.test_questions q
    JOIN allowed a ON a.id = q.test_id
  ),
  chk AS (
    SELECT r.test_id, r.qid, (o.id IS NULL) AS missing
    FROM refs r
    LEFT JOIN storage.objects o
      ON o.bucket_id = 'question-images'
     AND o.name = public._pct_decode(r.path)
  )
  SELECT c.test_id,
         count(*)::int,
         (count(*) FILTER (WHERE c.missing))::int,
         (count(DISTINCT c.qid) FILTER (WHERE c.missing))::int
  FROM chk c
  GROUP BY c.test_id;
$$;

REVOKE ALL ON FUNCTION public._pct_decode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._pct_decode(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_check_test_images(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_check_test_images(uuid[]) TO authenticated, service_role;
