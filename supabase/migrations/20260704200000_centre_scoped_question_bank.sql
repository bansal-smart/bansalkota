-- =========================================================================
-- Centre-scoped Question Bank. Unlike tests/test_series, the question bank
-- is fully separate per centre: centre admins get their own private bank
-- (centre_id = their own centre) with NO visibility into the global
-- (centre_id IS NULL) bank maintained by super-admin/admin/teacher/staff,
-- and vice versa. (See 20260704200200_question_bank_no_global_read_for_centre.sql
-- which drops the read-only global-visibility policy originally added here.)
-- =========================================================================

-- 1. Schema: add nullable centre_id
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS question_bank_centre_id_idx ON public.question_bank (centre_id);

-- 2. Rewrite the original global-only policies (from 20260430071612) to
-- scope them to centre_id IS NULL. Also add super_admin explicitly — the
-- original policies only listed teacher/staff/admin, which meant super
-- admins relied solely on the answer-fetch RPC's own check; since we must
-- rewrite these anyway, close that gap too (strictly additive).
DROP POLICY IF EXISTS "Teachers and staff can view question bank" ON public.question_bank;
CREATE POLICY "Teachers and staff can view question bank"
ON public.question_bank
FOR SELECT
TO authenticated
USING (
  centre_id IS NULL
  AND (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Teachers can add questions" ON public.question_bank;
CREATE POLICY "Teachers can add questions"
ON public.question_bank
FOR INSERT
TO authenticated
WITH CHECK (
  centre_id IS NULL
  AND created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners and staff can update questions" ON public.question_bank;
CREATE POLICY "Owners and staff can update questions"
ON public.question_bank
FOR UPDATE
TO authenticated
USING (
  centre_id IS NULL
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
)
WITH CHECK (
  centre_id IS NULL
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners and staff can delete questions" ON public.question_bank;
CREATE POLICY "Owners and staff can delete questions"
ON public.question_bank
FOR DELETE
TO authenticated
USING (
  centre_id IS NULL
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 3. Centre staff: full CRUD on their own centre's rows.
DROP POLICY IF EXISTS "Centre admins manage own centre question bank" ON public.question_bank;
CREATE POLICY "Centre admins manage own centre question bank"
ON public.question_bank
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

-- 4. Centre staff: read-only SELECT on the global bank (mirrors
-- "Centre staff view global tests" in 20260704193000_...sql).
DROP POLICY IF EXISTS "Centre staff view global question bank" ON public.question_bank;
CREATE POLICY "Centre staff view global question bank"
ON public.question_bank
FOR SELECT
TO authenticated
USING (
  centre_id IS NULL
  AND public.is_any_centre_staff(auth.uid())
);
