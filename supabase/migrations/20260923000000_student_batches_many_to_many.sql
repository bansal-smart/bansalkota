-- Multi-batch membership for students.
--
-- Until now a student belonged to exactly one batch via profiles.batch_id, so
-- adding them to e.g. an AITS test-series batch meant overwriting their
-- classroom batch. student_batches is the many-to-many replacement (modelled
-- on enrollments: user_id + FK, unique pair, timestamps).
--
-- profiles.batch_id is DEPRECATED as a membership source but kept for a
-- transition period as the student's "primary" (home/classroom) batch:
--   * bulk-import, center-create-student, cbt-bulk-setup and
--     centre_update_student_batch still write it; trg_sync_primary_batch
--     mirrors every such write into student_batches (moving only the primary
--     row, never touching additional batches), so those paths need no change.
--   * centre scoping of centreless students and display fallbacks still read it.
-- Every "is this student in batch X" check must read student_batches.

CREATE TABLE IF NOT EXISTS public.student_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.course_batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_batches_user_id_batch_id_key UNIQUE (user_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_student_batches_batch_id ON public.student_batches(batch_id);

COMMENT ON TABLE public.student_batches IS
  'Many-to-many student <-> batch membership. Source of truth for batch membership; profiles.batch_id is the deprecated primary batch, mirrored here by trg_sync_primary_batch.';
COMMENT ON COLUMN public.profiles.batch_id IS
  'DEPRECATED for membership checks — use student_batches. Kept as the student''s primary (classroom) batch during the transition; mirrored into student_batches by trg_sync_primary_batch.';

DROP TRIGGER IF EXISTS trg_student_batches_updated ON public.student_batches;
CREATE TRIGGER trg_student_batches_updated
  BEFORE UPDATE ON public.student_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Backfill: one row per student that currently has a batch. Runs before the
-- visibility trigger below exists so already-assigned students in a batch
-- that has since been disabled keep their membership.
-- ---------------------------------------------------------------------------
INSERT INTO public.student_batches (user_id, batch_id)
SELECT p.user_id, p.batch_id
FROM public.profiles p
WHERE p.batch_id IS NOT NULL AND p.user_id IS NOT NULL
ON CONFLICT (user_id, batch_id) DO NOTHING;

DO $$
DECLARE
  v_expected bigint;
  v_actual bigint;
BEGIN
  SELECT count(*) INTO v_expected FROM public.profiles WHERE batch_id IS NOT NULL AND user_id IS NOT NULL;
  SELECT count(*) INTO v_actual
  FROM public.profiles p
  JOIN public.student_batches sb ON sb.user_id = p.user_id AND sb.batch_id = p.batch_id
  WHERE p.batch_id IS NOT NULL;
  IF v_expected <> v_actual THEN
    RAISE EXCEPTION 'student_batches backfill mismatch: % profiles with batch_id, % backfilled', v_expected, v_actual;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Visibility guard for additional batches — same rules as
-- enforce_batch_visibility_on_profile. The primary batch is skipped because
-- the profiles trigger already validated it (and legacy rows must survive).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_batch_visibility_on_student_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visibility public.batch_visibility;
  v_centre_id uuid;
  v_primary uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.batch_id IS NOT DISTINCT FROM OLD.batch_id THEN
    RETURN NEW;
  END IF;

  SELECT p.centre_id, p.batch_id INTO v_centre_id, v_primary
  FROM public.profiles p WHERE p.user_id = NEW.user_id;

  IF NEW.batch_id IS NOT DISTINCT FROM v_primary THEN
    RETURN NEW;
  END IF;

  SELECT visibility INTO v_visibility FROM public.course_batches WHERE id = NEW.batch_id;
  IF v_visibility IS NULL THEN
    RAISE EXCEPTION 'Batch % does not exist', NEW.batch_id;
  END IF;
  IF v_visibility = 'disabled' THEN
    RAISE EXCEPTION 'This batch is disabled and cannot accept new students';
  END IF;
  IF v_visibility = 'centre_specific' AND NOT (
    v_centre_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.batch_centre_visibility
      WHERE batch_id = NEW.batch_id AND centre_id = v_centre_id
    )
  ) THEN
    RAISE EXCEPTION 'This batch is not available to this student''s centre';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_batch_visibility_student_batch ON public.student_batches;
CREATE TRIGGER trg_enforce_batch_visibility_student_batch
  BEFORE INSERT OR UPDATE OF batch_id ON public.student_batches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_batch_visibility_on_student_batch();

-- ---------------------------------------------------------------------------
-- Mirror profiles.batch_id (primary) into student_batches. A change of
-- primary moves only the old primary row; additional batches are untouched,
-- so legacy single-batch writers never strip a test-series batch.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_primary_batch_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.batch_id IS NOT NULL
     AND OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    DELETE FROM public.student_batches
    WHERE user_id = NEW.user_id AND batch_id = OLD.batch_id;
  END IF;
  IF NEW.batch_id IS NOT NULL THEN
    INSERT INTO public.student_batches (user_id, batch_id)
    VALUES (NEW.user_id, NEW.batch_id)
    ON CONFLICT (user_id, batch_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_batch ON public.profiles;
CREATE TRIGGER trg_sync_primary_batch
  AFTER INSERT OR UPDATE OF batch_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_batch_membership();

-- ---------------------------------------------------------------------------
-- RLS. Writes go through the manage-student edge function (service role);
-- clients only read.
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;

-- Centre staff reach centreless (Kota) students through batches their centre
-- owns — the multi-batch version of the old profiles.batch_id mapping.
CREATE OR REPLACE FUNCTION public.is_centre_staff_via_student_batch(_staff_id uuid, _student_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_batches sb
    JOIN public.course_batches b ON b.id = sb.batch_id
    JOIN public.centre_staff cs ON cs.centre_id = b.centre_id
    WHERE sb.user_id = _student_id
      AND cs.user_id = _staff_id
      AND public.has_permission(_staff_id, _module, _action, cs.centre_id)
  );
$$;

DROP POLICY IF EXISTS "Users can view their own batches" ON public.student_batches;
CREATE POLICY "Users can view their own batches" ON public.student_batches
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins manage all student batches" ON public.student_batches;
CREATE POLICY "Admins manage all student batches" ON public.student_batches
  FOR ALL TO authenticated
  USING (public.is_admin_or_super((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_super((SELECT auth.uid())));

DROP POLICY IF EXISTS "Centre staff view their students batches" ON public.student_batches;
CREATE POLICY "Centre staff view their students batches" ON public.student_batches
  FOR SELECT TO authenticated
  USING (
    public.is_centre_staff_for_student((SELECT auth.uid()), user_id)
    OR public.is_centre_staff_via_student_batch((SELECT auth.uid()), user_id, 'students', 'view')
  );

-- Centre staff can see centreless students who are in any of their centre's
-- batches, not only the primary one.
DROP POLICY IF EXISTS "Centre staff view batch-mapped students" ON public.profiles;
CREATE POLICY "Centre staff view batch-mapped students" ON public.profiles
  FOR SELECT
  USING (
    centre_id IS NULL
    AND public.is_centre_staff_via_student_batch(auth.uid(), user_id, 'students', 'view')
  );

-- ---------------------------------------------------------------------------
-- Read paths: batch-targeted tests now reach a student through ANY of their
-- batches. Displayed batch = the matching allowed batch (primary preferred).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_test_not_attempted(_test_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, roll_number text, batch_id uuid, batch_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_test RECORD;
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

  IF v_test.cbt_allowed_batch_ids IS NULL
     OR array_length(v_test.cbt_allowed_batch_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    NULLIF(trim(p.full_name), '')::text AS full_name,
    NULLIF(trim(p.roll_number), '')::text AS roll_number,
    mb.mbid,
    COALESCE(NULLIF(trim(cb.name), ''), NULLIF(trim(cb.code), ''))::text AS batch_name
  FROM public.profiles p
  CROSS JOIN LATERAL (
    SELECT sb.batch_id AS mbid
    FROM public.student_batches sb
    WHERE sb.user_id = p.user_id
      AND sb.batch_id = ANY(v_test.cbt_allowed_batch_ids)
    ORDER BY (sb.batch_id IS NOT DISTINCT FROM p.batch_id) DESC, sb.created_at
    LIMIT 1
  ) mb
  LEFT JOIN public.course_batches cb ON cb.id = mb.mbid
  WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.test_id = _test_id AND ta.user_id = p.user_id
    )
  ORDER BY cb.name NULLS LAST, p.roll_number NULLS LAST, p.full_name NULLS LAST;
END;
$function$;

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
    SELECT DISTINCT sb.user_id AS uid
    FROM public.student_batches sb
    WHERE v_test.cbt_allowed_batch_ids IS NOT NULL
      AND array_length(v_test.cbt_allowed_batch_ids, 1) > 0
      AND sb.batch_id = ANY(v_test.cbt_allowed_batch_ids)
      AND sb.user_id NOT IN (SELECT eu.uid FROM excluded_users eu)
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
    SELECT p.user_id AS uid, p.roll_number, p.full_name,
           COALESCE(mb.mbid, p.batch_id) AS bid,
           cb.name AS batch_name, cb.code AS batch_code,
           a.score, a.metadata, (a.uid IS NOT NULL) AS is_present
    FROM audience aud
    JOIN public.profiles p ON p.user_id = aud.uid
    LEFT JOIN LATERAL (
      SELECT sb.batch_id AS mbid
      FROM public.student_batches sb
      WHERE sb.user_id = p.user_id
        AND v_test.cbt_allowed_batch_ids IS NOT NULL
        AND sb.batch_id = ANY(v_test.cbt_allowed_batch_ids)
      ORDER BY (sb.batch_id IS NOT DISTINCT FROM p.batch_id) DESC, sb.created_at
      LIMIT 1
    ) mb ON true
    LEFT JOIN public.course_batches cb ON cb.id = COALESCE(mb.mbid, p.batch_id)
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

-- Kiosk: live tests for the signed-in student across all their batches.
-- cbt_live_tests_for_batch is kept for any older client still calling it.
CREATE OR REPLACE FUNCTION public.cbt_live_tests_for_me()
 RETURNS TABLE(id uuid, title text, description text, duration_minutes integer, total_questions integer, total_marks numeric, starts_at timestamp with time zone, ends_at timestamp with time zone, subjects text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.title, t.description, t.duration_minutes,
         t.total_questions, t.total_marks, t.starts_at, t.ends_at, t.subjects
  FROM public.tests t
  WHERE t.allows_kiosk_mode = true
    AND t.is_published = true
    AND (t.ends_at IS NULL OR now() <= t.ends_at)
    AND (
      t.cbt_allowed_batch_ids IS NULL
      OR array_length(t.cbt_allowed_batch_ids, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM public.student_batches sb
        WHERE sb.user_id = auth.uid()
          AND sb.batch_id = ANY(t.cbt_allowed_batch_ids)
      )
    )
  ORDER BY COALESCE(t.starts_at, t.created_at) ASC;
$function$;

REVOKE ALL ON FUNCTION public.cbt_live_tests_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cbt_live_tests_for_me() TO authenticated;
