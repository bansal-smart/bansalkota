-- BUG: "Only super admins manage roles" (migration 20260619125736) is a
-- RESTRICTIVE policy scoped `FOR ALL`, intended only to guard against
-- self-role-escalation on writes ("belt-and-suspenders" per its own
-- comment). Because RESTRICTIVE policies AND against every permissive
-- policy regardless of command, it silently vetoed SELECT too — overriding
-- "Users can view their own roles", "Staff can view all user_roles", and
-- the new "Centre staff view roles of their centre's users" policy. Net
-- effect: nobody except admin/super_admin could ever read user_roles at
-- all, which is why AdminStudentsPage.tsx's `select user_id, role from
-- user_roles` returned nothing for a center_admin and the Students page
-- always showed "No students found." Narrow the restrictive policy to
-- write commands only so its actual intent (block self-escalation) is
-- preserved without collaterally blocking reads.

DROP POLICY IF EXISTS "Only super admins manage roles" ON public.user_roles;

CREATE POLICY "Only super admins manage roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only super admins update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only super admins delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
