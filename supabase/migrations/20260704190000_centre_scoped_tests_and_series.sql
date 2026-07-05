-- =========================================================================
-- Centre-scoped Test Platform: allow centre admins to create/manage their
-- own tests and test series, fully separated from super-admin-owned
-- (global, centre_id IS NULL) tests and series.
-- =========================================================================

-- 1. Schema: add nullable centre_id to tests and test_series
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE;

ALTER TABLE public.test_series
  ADD COLUMN IF NOT EXISTS centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tests_centre_id_idx ON public.tests (centre_id);
CREATE INDEX IF NOT EXISTS test_series_centre_id_idx ON public.test_series (centre_id);

-- 2. RLS: tests
DROP POLICY IF EXISTS "Staff manage all tests" ON public.tests;
DROP POLICY IF EXISTS "Centre admins manage own centre tests" ON public.tests;

-- Super admins / admins / teachers manage every test EXCEPT centre-owned ones
-- (centre-owned tests are fully separated and only manageable by that centre's staff).
CREATE POLICY "Staff manage all tests"
ON public.tests
FOR ALL
TO authenticated
USING (
  centre_id IS NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
)
WITH CHECK (
  centre_id IS NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
);

CREATE POLICY "Centre admins manage own centre tests"
ON public.tests
FOR ALL
TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
);

-- 3. RLS: test_questions (belongs to a test; scope follows the parent test's centre)
DROP POLICY IF EXISTS "View questions of accessible tests" ON public.test_questions;
DROP POLICY IF EXISTS "Staff manage all test questions" ON public.test_questions;
DROP POLICY IF EXISTS "Centre admins manage own centre test questions" ON public.test_questions;

CREATE POLICY "View questions of accessible tests"
ON public.test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND (
        t.is_published = true
        OR t.created_by = auth.uid()
        OR (t.centre_id IS NULL AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
          OR public.has_role(auth.uid(), 'teacher'::public.app_role)
        ))
        OR (t.centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), t.centre_id))
      )
  )
);

CREATE POLICY "Staff manage all test questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.centre_id IS NULL
  )
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.centre_id IS NULL
  )
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
);

CREATE POLICY "Centre admins manage own centre test questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.centre_id IS NOT NULL
      AND public.is_centre_staff(auth.uid(), t.centre_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.centre_id IS NOT NULL
      AND public.is_centre_staff(auth.uid(), t.centre_id)
  )
);

-- 4. RLS: test_series
DROP POLICY IF EXISTS "Staff manage all test series" ON public.test_series;
DROP POLICY IF EXISTS "Centre admins manage own centre test series" ON public.test_series;

CREATE POLICY "Staff manage all test series"
ON public.test_series
FOR ALL
TO authenticated
USING (
  centre_id IS NULL
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
)
WITH CHECK (
  centre_id IS NULL
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
);

CREATE POLICY "Centre admins manage own centre test series"
ON public.test_series
FOR ALL
TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.is_centre_staff(auth.uid(), centre_id)
);

-- 5. Delete policy: super_admin-only delete for global tests remains; add
-- an equivalent for centre admins deleting their own centre's tests.
DROP POLICY IF EXISTS "Super admins can delete tests" ON public.tests;
CREATE POLICY "Super admins can delete tests"
  ON public.tests FOR DELETE TO authenticated
  USING (
    (centre_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
    OR (centre_id IS NOT NULL AND public.is_centre_staff(auth.uid(), centre_id))
  );
