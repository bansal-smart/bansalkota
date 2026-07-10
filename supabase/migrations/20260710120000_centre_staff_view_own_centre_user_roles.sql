-- BUG: AdminStudentsPage.tsx (reused by centre admins under the Phase 2
-- merge) does an unfiltered `select user_id, role from user_roles` to build
-- its student/staff id sets. RLS on user_roles only lets admin/super_admin
-- read every row, or a user read their own row — a center_admin (no custom
-- role) got zero usable rows back, so the page always rendered "No students
-- found" even though profiles RLS (has_permission) was already correctly
-- scoping their students. Fix: let centre staff read user_roles rows for any
-- user whose profile is centre_id-scoped to a centre they staff, mirroring
-- the existing "Centre staff view their students" policy on profiles.

CREATE POLICY "Centre staff view roles of their centre's users"
ON public.user_roles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'students', 'view', p.centre_id)
  )
);
