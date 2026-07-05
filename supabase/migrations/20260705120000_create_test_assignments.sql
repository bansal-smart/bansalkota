-- Direct per-student test assignment, mirroring how `enrollments` works for
-- courses. Existing test eligibility is batch-based only
-- (tests.cbt_allowed_batch_ids) or course-based (tests.course_id) — there was
-- no way to assign a single test to individual students regardless of batch.
-- This table is purely additive: TestListPage's visibleTests filter already
-- treats unrestricted tests as open to everyone, batch-matched tests as
-- visible, or course-enrolled as visible; we add "has an active assignment
-- row" as one more OR branch, so nothing existing changes.

CREATE TABLE public.test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, user_id)
);

CREATE INDEX test_assignments_test_id_idx ON public.test_assignments (test_id);
CREATE INDEX test_assignments_user_id_idx ON public.test_assignments (user_id);

ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

-- Students can see their own assignment rows (used by TestListPage to
-- determine visibility alongside batch/course checks).
CREATE POLICY "Students view own test assignments"
ON public.test_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins/super admins manage all assignment rows.
CREATE POLICY "Admins manage all test assignments"
ON public.test_assignments
FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Centre staff manage assignment rows only for students who belong to one of
-- their own centres — regardless of whether the test itself is their own or
-- a global (Bansal) test, since assigning students is a centre-side action
-- distinct from owning/editing the test.
CREATE POLICY "Centre staff manage assignments for their own students"
ON public.test_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.centre_staff cs ON cs.centre_id = p.centre_id
    WHERE p.user_id = test_assignments.user_id
      AND cs.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.centre_staff cs ON cs.centre_id = p.centre_id
    WHERE p.user_id = test_assignments.user_id
      AND cs.user_id = auth.uid()
  )
);
