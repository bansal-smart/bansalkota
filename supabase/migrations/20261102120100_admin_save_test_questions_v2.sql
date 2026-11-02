-- v2 of admin_save_test_questions (supersedes 20261102120000).
--
-- Fixes found in review of v1:
--  1. (BLOCKER) v1 used `SET col = CASE WHEN ... ELSE q.col END`, which READS the target
--     columns. `authenticated` is deliberately denied SELECT on the answer-key columns
--     (correct_answer, numerical_answer(s), tolerance, answer_range_min/max,
--     answer_order_matters — see 20261005120000_hide_test_answer_keys.sql) but may UPDATE
--     them. Postgres checks column privileges for every column a statement references, so
--     every real editor save would have failed with 42501. v2 never reads those columns:
--     rows are grouped by the set of keys they carry and each group runs
--     `SET col = s.col` (write-only, exactly like the old per-row PATCH) with a SET list
--     built from a hard-coded whitelist (no caller-controlled identifiers).
--  2. Function-level `SET statement_timeout` does not re-arm the already-running statement
--     timer, so it was misleading; removed. lock_timeout (read at each lock wait) stays.
--  3. The advisory lock was taken before any authorization check, so any logged-in user
--     could hold/queue on another test's lock. v2 first proves the caller can WRITE a
--     question of this test (row lock probe, evaluated through the UPDATE RLS policies) and
--     only then takes the lock. Also caps the payload at 1000 rows.
--  4. Duplicate ids in the payload are collapsed (last one wins) and `requested` reports the
--     distinct count so the client's updated-vs-requested check cannot false-alarm.
--
-- Still SECURITY INVOKER: the existing RLS policies on test_questions decide who may write.
CREATE OR REPLACE FUNCTION public.admin_save_test_questions(_test_id uuid, _rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
SET lock_timeout = '20s'
AS $$
DECLARE
  -- Whitelist: writable column -> SQL type. The ONLY identifiers/types that can reach EXECUTE.
  _cols constant jsonb := '{
    "position": "integer", "subject": "text", "topic": "text",
    "question_text": "text", "question_image_url": "text", "question_type": "text",
    "marks_correct": "numeric", "marks_wrong": "numeric",
    "options": "jsonb", "option_images": "jsonb", "correct_answer": "jsonb",
    "answer_count": "smallint", "numerical_answers": "numeric[]",
    "answer_order_matters": "boolean", "answer_match_mode": "text",
    "partial_marking": "boolean", "numerical_answer": "numeric", "tolerance": "numeric",
    "answer_range_min": "numeric", "answer_range_max": "numeric", "answer_format": "text"
  }';
  _unknown   text;
  _requested integer;
  _updated   integer := 0;
  _n         integer;
  _grp       record;
  _set       text;
  _defs      text;
BEGIN
  IF _test_id IS NULL THEN
    RAISE EXCEPTION 'test id is required' USING ERRCODE = '22023';
  END IF;
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION '_rows must be a JSON array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_rows) = 0 THEN
    RETURN jsonb_build_object('requested', 0, 'updated', 0);
  END IF;
  IF jsonb_array_length(_rows) > 1000 THEN
    RAISE EXCEPTION 'too many rows in one save (max 1000)' USING ERRCODE = '22023';
  END IF;

  -- Reject (rather than silently drop) any key we do not know how to write.
  SELECT k INTO _unknown
  FROM jsonb_array_elements(_rows) AS e(v), LATERAL jsonb_object_keys(e.v) AS k
  WHERE k <> 'id' AND NOT (_cols ? k)
  LIMIT 1;
  IF _unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown question column: %', _unknown USING ERRCODE = '22023';
  END IF;

  -- Authorization BEFORE locking: the caller must be able to write at least one question of
  -- this test (FOR NO KEY UPDATE is evaluated through the UPDATE RLS policies). A user who
  -- cannot edit this test never reaches the advisory lock.
  PERFORM 1 FROM public.test_questions WHERE test_id = _test_id LIMIT 1 FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not allowed to edit this test, or it has no questions' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent saves of the same test (released at commit/rollback).
  PERFORM pg_advisory_xact_lock(hashtextextended('admin_save_test_questions:' || _test_id::text, 0));

  -- Distinct ids (+ rows that carry no id, so a mismatch stays visible to the caller).
  SELECT count(DISTINCT e.v ->> 'id') + count(*) FILTER (WHERE e.v ->> 'id' IS NULL)
    INTO _requested
  FROM jsonb_array_elements(_rows) AS e(v);

  FOR _grp IN
    WITH numbered AS (
      SELECT e.v, e.ord FROM jsonb_array_elements(_rows) WITH ORDINALITY AS e(v, ord)
      WHERE e.v ->> 'id' IS NOT NULL
    ),
    last_per_id AS (               -- duplicate ids: the last occurrence wins
      SELECT DISTINCT ON (v ->> 'id') v FROM numbered ORDER BY v ->> 'id', ord DESC
    )
    SELECT t.ks, jsonb_agg(t.v) AS rws
    FROM (
      SELECT v, ARRAY(SELECT k FROM jsonb_object_keys(v) AS k WHERE k <> 'id' ORDER BY k) AS ks
      FROM last_per_id
    ) t
    GROUP BY t.ks
  LOOP
    CONTINUE WHEN cardinality(_grp.ks) = 0;

    SELECT string_agg(format('%I = s.%I', k, k), ', '),
           string_agg(format('%I %s', k, _cols ->> k), ', ')
      INTO _set, _defs
    FROM unnest(_grp.ks) AS k;

    EXECUTE format(
      'UPDATE public.test_questions q SET %s '
      'FROM jsonb_to_recordset($1) AS s(id uuid, %s) '
      'WHERE q.id = s.id AND q.test_id = $2',
      _set, _defs
    ) USING _grp.rws, _test_id;

    GET DIAGNOSTICS _n = ROW_COUNT;
    _updated := _updated + _n;
  END LOOP;

  RETURN jsonb_build_object('requested', _requested, 'updated', _updated);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_test_questions(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_test_questions(uuid, jsonb) TO authenticated, service_role;
