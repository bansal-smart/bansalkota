-- Allow centre admins to manage test-support queries raised by their own students.
-- The fallback through course_batches matches the Students page: legacy profiles
-- with a NULL centre_id are still scoped when their assigned batch belongs to the
-- centre, while profiles explicitly assigned elsewhere remain excluded.

DROP POLICY IF EXISTS "Centre staff view batch-mapped students" ON public.profiles;
CREATE POLICY "Centre staff view batch-mapped students"
ON public.profiles FOR SELECT TO authenticated
USING (
  centre_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.course_batches b
    JOIN public.centre_staff cs ON cs.centre_id = b.centre_id
    WHERE b.id = profiles.batch_id
      AND cs.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'students', 'view', cs.centre_id)
  )
);

DROP POLICY IF EXISTS "Centre staff view their students test support queries" ON public.test_support_queries;
CREATE POLICY "Centre staff view their students test support queries"
ON public.test_support_queries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.centre_staff cs
    JOIN public.profiles p ON p.user_id = test_support_queries.user_id
    LEFT JOIN public.course_batches b ON b.id = p.batch_id
    WHERE cs.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'test_platform', 'view', cs.centre_id)
      AND (p.centre_id = cs.centre_id OR (p.centre_id IS NULL AND b.centre_id = cs.centre_id))
  )
);

DROP POLICY IF EXISTS "Centre staff update their students test support queries" ON public.test_support_queries;
CREATE POLICY "Centre staff update their students test support queries"
ON public.test_support_queries FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.centre_staff cs
    JOIN public.profiles p ON p.user_id = test_support_queries.user_id
    LEFT JOIN public.course_batches b ON b.id = p.batch_id
    WHERE cs.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'test_platform', 'edit', cs.centre_id)
      AND (p.centre_id = cs.centre_id OR (p.centre_id IS NULL AND b.centre_id = cs.centre_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.centre_staff cs
    JOIN public.profiles p ON p.user_id = test_support_queries.user_id
    LEFT JOIN public.course_batches b ON b.id = p.batch_id
    WHERE cs.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'test_platform', 'edit', cs.centre_id)
      AND (p.centre_id = cs.centre_id OR (p.centre_id IS NULL AND b.centre_id = cs.centre_id))
  )
);