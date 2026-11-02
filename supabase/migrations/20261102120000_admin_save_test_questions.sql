-- Batched, atomic "save all questions of a test" for the test editor.
--
-- Problem (Nov 2 2026): CreateTestPage saved N questions as N concurrent
-- single-row PATCH requests (Promise.all). For a 75-question test that is 75
-- HTTP requests, 75 transactions, 75x RLS evaluation and 75x trigger runs all
-- fighting for a small PostgREST pool. Latencies fanned out from 1s to 13s, ~25%
-- returned HTTP 500, the editor re-clicked Save, and overlapping retry waves
-- blocked on each other's row locks until each statement hit the 2-minute
-- statement_timeout ("canceling statement due to statement timeout"). The old
-- code also left tests half-saved (no atomicity).
--
-- This RPC does the same work as ONE statement in ONE short transaction:
--   * set-based UPDATE ... FROM (one round trip, one RLS pass per row, no pool storm)
--   * SECURITY INVOKER -> the existing test_questions RLS policies still decide who
--     may write (no privilege change)
--   * per-test advisory lock -> two overlapping saves of the SAME test queue up
--     instead of interleaving row locks; lock_timeout makes the second one fail fast
--     (seconds) with a clear error rather than hanging for 2 minutes
--   * "presence-aware": a column is only written when its key is present in that
--     row's JSON, exactly like the old per-row PATCH (which only sent the keys the
--     editor built), so e.g. numeric-only columns are never wiped on MCQ rows.
CREATE OR REPLACE FUNCTION public.admin_save_test_questions(_test_id uuid, _rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
SET lock_timeout = '20s'
SET statement_timeout = '90s'
AS $$
DECLARE
  _requested integer;
  _updated   integer;
BEGIN
  IF _test_id IS NULL THEN
    RAISE EXCEPTION 'test id is required' USING ERRCODE = '22023';
  END IF;
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION '_rows must be a JSON array' USING ERRCODE = '22023';
  END IF;

  _requested := jsonb_array_length(_rows);
  IF _requested = 0 THEN
    RETURN jsonb_build_object('requested', 0, 'updated', 0);
  END IF;

  -- Serialize concurrent saves of the same test (released at commit/rollback).
  PERFORM pg_advisory_xact_lock(hashtextextended('admin_save_test_questions:' || _test_id::text, 0));

  WITH src AS (
    SELECT x.*, ARRAY(SELECT jsonb_object_keys(e.value)) AS k
    FROM jsonb_array_elements(_rows) AS e(value),
    LATERAL jsonb_to_record(e.value) AS x(
      id uuid,
      "position" integer,
      subject text,
      topic text,
      question_text text,
      question_image_url text,
      question_type text,
      marks_correct numeric,
      marks_wrong numeric,
      options jsonb,
      option_images jsonb,
      correct_answer jsonb,
      answer_count smallint,
      numerical_answers numeric[],
      answer_order_matters boolean,
      answer_match_mode text,
      partial_marking boolean,
      numerical_answer numeric,
      tolerance numeric,
      answer_range_min numeric,
      answer_range_max numeric,
      answer_format text
    )
  )
  UPDATE public.test_questions q SET
    "position"           = CASE WHEN 'position'           = ANY (s.k) THEN s."position"           ELSE q."position"           END,
    subject              = CASE WHEN 'subject'            = ANY (s.k) THEN s.subject              ELSE q.subject              END,
    topic                = CASE WHEN 'topic'              = ANY (s.k) THEN s.topic                ELSE q.topic                END,
    question_text        = CASE WHEN 'question_text'      = ANY (s.k) THEN s.question_text        ELSE q.question_text        END,
    question_image_url   = CASE WHEN 'question_image_url' = ANY (s.k) THEN s.question_image_url   ELSE q.question_image_url   END,
    question_type        = CASE WHEN 'question_type'      = ANY (s.k) THEN s.question_type        ELSE q.question_type        END,
    marks_correct        = CASE WHEN 'marks_correct'      = ANY (s.k) THEN s.marks_correct        ELSE q.marks_correct        END,
    marks_wrong          = CASE WHEN 'marks_wrong'        = ANY (s.k) THEN s.marks_wrong          ELSE q.marks_wrong          END,
    options              = CASE WHEN 'options'            = ANY (s.k) THEN s.options              ELSE q.options              END,
    option_images        = CASE WHEN 'option_images'      = ANY (s.k) THEN s.option_images        ELSE q.option_images        END,
    correct_answer       = CASE WHEN 'correct_answer'     = ANY (s.k) THEN s.correct_answer       ELSE q.correct_answer       END,
    answer_count         = CASE WHEN 'answer_count'       = ANY (s.k) THEN s.answer_count         ELSE q.answer_count         END,
    numerical_answers    = CASE WHEN 'numerical_answers'  = ANY (s.k) THEN s.numerical_answers    ELSE q.numerical_answers    END,
    answer_order_matters = CASE WHEN 'answer_order_matters' = ANY (s.k) THEN s.answer_order_matters ELSE q.answer_order_matters END,
    answer_match_mode    = CASE WHEN 'answer_match_mode'  = ANY (s.k) THEN s.answer_match_mode    ELSE q.answer_match_mode    END,
    partial_marking      = CASE WHEN 'partial_marking'    = ANY (s.k) THEN s.partial_marking      ELSE q.partial_marking      END,
    numerical_answer     = CASE WHEN 'numerical_answer'   = ANY (s.k) THEN s.numerical_answer     ELSE q.numerical_answer     END,
    tolerance            = CASE WHEN 'tolerance'          = ANY (s.k) THEN s.tolerance            ELSE q.tolerance            END,
    answer_range_min     = CASE WHEN 'answer_range_min'   = ANY (s.k) THEN s.answer_range_min     ELSE q.answer_range_min     END,
    answer_range_max     = CASE WHEN 'answer_range_max'   = ANY (s.k) THEN s.answer_range_max     ELSE q.answer_range_max     END,
    answer_format        = CASE WHEN 'answer_format'      = ANY (s.k) THEN s.answer_format        ELSE q.answer_format        END
  FROM src s
  WHERE q.id = s.id
    AND q.test_id = _test_id;

  GET DIAGNOSTICS _updated = ROW_COUNT;

  RETURN jsonb_build_object('requested', _requested, 'updated', _updated);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_test_questions(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_test_questions(uuid, jsonb) TO authenticated, service_role;
