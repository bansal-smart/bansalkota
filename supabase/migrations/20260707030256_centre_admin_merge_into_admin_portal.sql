-- Phase 2 groundwork, part 2: center_admin is merged into the /admin/* portal
-- (same AdminLayout/routes, nav filtered to a fixed franchise subset) instead
-- of a separate /centre/* app, so franchise centres directly reuse the same
-- admin pages/tables rather than parallel bespoke ones.
--
-- This requires two module-key corrections against the Phase-1 seed:
--   1. 'gallery' (as seeded for scope='centre' roles) would collide with the
--      admin portal's OWN 'gallery' module — but that key gates the GLOBAL
--      site-wide gallery_albums table (AdminGalleryPage), not a centre's own
--      centre_gallery. Renamed to 'centre_gallery' (own key, own new page)
--      so the two are never confused.
--   2. 'batches_cbt' / 'student_analysis' are renamed to 'batches' /
--      'student_reports' to reuse the EXACT keys the existing admin pages
--      (AdminBatchesPage, AdminStudentReportsPage) already use, since those
--      pages are now reused as-is rather than rebuilt.
-- Only scope='centre' roles are touched — admin-scope 'gallery' rows (which
-- do mean the global gallery) are untouched.

UPDATE public.role_permissions rp
SET module = 'centre_gallery'
FROM public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre' AND rp.module = 'gallery';

UPDATE public.role_permissions rp
SET module = 'batches'
FROM public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre' AND rp.module = 'batches_cbt';

UPDATE public.role_permissions rp
SET module = 'student_reports'
FROM public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre' AND rp.module = 'student_analysis';

-- The seeded 'overview' rows had no corresponding page/RLS in the reused
-- admin-portal design (there's no dedicated centre dashboard) — drop them.
DELETE FROM public.role_permissions rp
USING public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre' AND rp.module = 'overview';

-- Fix the centre_gallery table's RLS policy to match (it was written with the
-- colliding 'gallery' key in the earlier fix-up migration).
DROP POLICY IF EXISTS "Centre staff & admins manage gallery" ON public.centre_gallery;
CREATE POLICY "Centre staff & admins manage gallery"
ON public.centre_gallery FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_gallery', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_gallery', 'edit', centre_id)
);
