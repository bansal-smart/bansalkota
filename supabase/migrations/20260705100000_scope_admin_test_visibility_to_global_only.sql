-- "Authenticated can view published tests" let any admin/super_admin see
-- EVERY test regardless of centre_id, including centre-owned drafts —
-- leaking centre admins' own tests into the Super Admin dashboard's
-- unfiltered `select * from tests` queries (AdminTestsPage.tsx and friends
-- have no centre_id filter, relying entirely on RLS to scope what they see).
-- Scope the admin/super_admin bypass to global (centre_id IS NULL) rows
-- only; the is_published/created_by branches are untouched so students can
-- still see published centre tests and creators can still see their own
-- drafts.
DROP POLICY IF EXISTS "Authenticated can view published tests" ON public.tests;
CREATE POLICY "Authenticated can view published tests"
ON public.tests
FOR SELECT
TO authenticated
USING (
  is_published = true
  OR created_by = auth.uid()
  OR (centre_id IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
);
