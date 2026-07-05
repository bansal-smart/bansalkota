-- =========================================================================
-- Centre admins should also SEE super-admin-created (global, centre_id IS
-- NULL) tests and test series on their Test Platform page — read-only,
-- they cannot edit/publish/delete them — and be able to "assign" a global
-- test to their own centre's students by adding their centre's batches to
-- that test's cbt_allowed_batch_ids (the existing eligibility mechanism
-- read by src/pages/TestListPage.tsx). Centre admins keep full CRUD over
-- rows they own (centre_id = their own centre), added in the previous
-- migration.
-- =========================================================================

-- 1. Read-only SELECT for centre staff on global tests / test series
DROP POLICY IF EXISTS "Centre staff view global tests" ON public.tests;
CREATE POLICY "Centre staff view global tests"
ON public.tests
FOR SELECT
TO authenticated
USING (
  centre_id IS NULL
  AND public.is_any_centre_staff(auth.uid())
);

DROP POLICY IF EXISTS "Centre staff view global test series" ON public.test_series;
CREATE POLICY "Centre staff view global test series"
ON public.test_series
FOR SELECT
TO authenticated
USING (
  centre_id IS NULL
  AND public.is_any_centre_staff(auth.uid())
);

-- 2. RPC: let centre staff assign/unassign a global test to their own
-- centre's batches, without granting any other edit rights on the test.
-- Mirrors the narrowly-scoped pattern used by centre_update_student_batch.
CREATE OR REPLACE FUNCTION public.centre_assign_test_batches(_test_id uuid, _batch_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _centre_id uuid;
  _test_centre_id uuid;
  _foreign_batch_count integer;
  _current_ids uuid[];
  _other_centre_ids uuid[];
BEGIN
  SELECT cs.centre_id INTO _centre_id
  FROM public.centre_staff cs
  WHERE cs.user_id = auth.uid()
  LIMIT 1;

  IF _centre_id IS NULL AND NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not a centre staff member';
  END IF;

  SELECT centre_id, cbt_allowed_batch_ids INTO _test_centre_id, _current_ids
  FROM public.tests WHERE id = _test_id;

  IF _test_centre_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only global (super-admin) tests can be assigned this way';
  END IF;

  IF _batch_ids IS NOT NULL AND array_length(_batch_ids, 1) > 0 THEN
    SELECT count(*) INTO _foreign_batch_count
    FROM public.course_batches
    WHERE id = ANY(_batch_ids) AND centre_id IS DISTINCT FROM _centre_id;
    IF _foreign_batch_count > 0 AND NOT public.is_admin_or_super(auth.uid()) THEN
      RAISE EXCEPTION 'Can only assign batches belonging to your own centre';
    END IF;
  END IF;

  -- Preserve any batch ids already on the test that belong to OTHER centres
  -- (so one centre's assignment can't wipe out another centre's assignment).
  SELECT COALESCE(array_agg(cb.id), '{}')
  INTO _other_centre_ids
  FROM unnest(COALESCE(_current_ids, '{}')) AS ids(id)
  JOIN public.course_batches cb ON cb.id = ids.id
  WHERE cb.centre_id IS DISTINCT FROM _centre_id;

  UPDATE public.tests
  SET cbt_allowed_batch_ids = (
    SELECT COALESCE(array_agg(DISTINCT x), '{}')
    FROM unnest(_other_centre_ids || COALESCE(_batch_ids, '{}')) AS x
  )
  WHERE id = _test_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.centre_assign_test_batches(uuid, uuid[]) TO authenticated;
