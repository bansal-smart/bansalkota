-- Which of these tests exist and are published?
--
-- Used by the Student Analysis report (and the student's own analytics) to count only
-- attempts of PUBLISHED tests. Reading public.tests directly is subject to RLS, and a
-- centre-staff user can only "see" global tests, their own centre's tests and tests reachable
-- through visible batches. A published test outside that set would be silently treated as
-- unpublished and its attempts dropped from the student's report. This function answers only
-- "is this id a published test?" and returns ids — no titles, questions or other data — so it
-- does not depend on the caller's test visibility.
--
-- Read-only. Deleted tests simply do not appear (test_attempts.test_id has no foreign key, so
-- orphan attempts remain; they are excluded because their test id is not returned here).
CREATE OR REPLACE FUNCTION public.published_test_ids(_test_ids uuid[])
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.tests t
  WHERE auth.uid() IS NOT NULL
    AND t.is_published = true
    AND t.id = ANY (
      -- cap the input so a caller cannot make this scan arbitrarily large
      _test_ids[1:1000]
    );
$$;

REVOKE ALL ON FUNCTION public.published_test_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.published_test_ids(uuid[]) TO authenticated, service_role;
