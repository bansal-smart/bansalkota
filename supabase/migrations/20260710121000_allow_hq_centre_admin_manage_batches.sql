-- BUG: AdminBatchesPage.tsx (/admin/batches) shows a "Add a new batch" form
-- and edit/delete actions to every /admin/* user, but RLS on course_batches
-- only ever granted writes to is_admin_or_super() — centre_admin got a raw
-- 42501 on insert. Per CONTEXT.md, franchise (non-HQ) centres are meant to
-- stay view-only here (they get auto-provisioned stream×class batches via
-- create_standard_batches(), decoupled from any course — manual creation
-- would fragment that standard naming scheme). Kota HQ is the documented
-- exception: it keeps its own legacy course-linked batches and is the one
-- centre whose admin should be able to manage this table directly, same as
-- admin/super_admin already can. Scope the new write policy to HQ only so
-- franchise centres remain correctly read-only.

CREATE POLICY "HQ centre staff manage HQ batches"
ON public.course_batches FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.centres c WHERE c.id = course_batches.centre_id AND c.is_hq = true)
  AND public.is_centre_staff(auth.uid(), centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.centres c WHERE c.id = course_batches.centre_id AND c.is_hq = true)
  AND public.is_centre_staff(auth.uid(), centre_id)
);
