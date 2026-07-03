
-- Fix recursive RLS on centre_staff by using a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.is_centre_admin_of(_user_id uuid, _centre_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_staff
    WHERE user_id = _user_id
      AND centre_id = _centre_id
      AND custom_role_id IS NULL
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Centre admins manage own centre staff" ON public.centre_staff;
DROP POLICY IF EXISTS "Centre admins read own centre staff" ON public.centre_staff;
DROP POLICY IF EXISTS "Staff read own center_staff rows" ON public.centre_staff;
DROP POLICY IF EXISTS "Admins manage center_staff" ON public.centre_staff;

-- Recreate without recursion
CREATE POLICY "Admins manage center_staff"
  ON public.centre_staff FOR ALL
  USING (is_admin_or_super(auth.uid()))
  WITH CHECK (is_admin_or_super(auth.uid()));

CREATE POLICY "Staff read own row"
  ON public.centre_staff FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_super(auth.uid()));

CREATE POLICY "Centre admins read centre staff"
  ON public.centre_staff FOR SELECT
  USING (public.is_centre_admin_of(auth.uid(), centre_id));

CREATE POLICY "Centre admins manage centre staff"
  ON public.centre_staff FOR ALL
  USING (public.is_centre_admin_of(auth.uid(), centre_id))
  WITH CHECK (public.is_centre_admin_of(auth.uid(), centre_id));

-- Also fix centre_roles / centre_role_permissions policies if they recurse
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.centre_roles'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.centre_roles', r.polname);
  END LOOP;
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.centre_role_permissions'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.centre_role_permissions', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Centre admins manage roles"
  ON public.centre_roles FOR ALL
  USING (is_admin_or_super(auth.uid()) OR public.is_centre_admin_of(auth.uid(), centre_id))
  WITH CHECK (is_admin_or_super(auth.uid()) OR public.is_centre_admin_of(auth.uid(), centre_id));

CREATE POLICY "Staff read centre roles"
  ON public.centre_roles FOR SELECT
  USING (
    is_admin_or_super(auth.uid())
    OR EXISTS (SELECT 1 FROM public.centre_staff s WHERE s.user_id = auth.uid() AND s.centre_id = centre_roles.centre_id)
  );

CREATE POLICY "Centre admins manage role perms"
  ON public.centre_role_permissions FOR ALL
  USING (
    is_admin_or_super(auth.uid())
    OR EXISTS (SELECT 1 FROM public.centre_roles r WHERE r.id = centre_role_permissions.role_id AND public.is_centre_admin_of(auth.uid(), r.centre_id))
  )
  WITH CHECK (
    is_admin_or_super(auth.uid())
    OR EXISTS (SELECT 1 FROM public.centre_roles r WHERE r.id = centre_role_permissions.role_id AND public.is_centre_admin_of(auth.uid(), r.centre_id))
  );

CREATE POLICY "Staff read role perms"
  ON public.centre_role_permissions FOR SELECT
  USING (
    is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_roles r
      JOIN public.centre_staff s ON s.centre_id = r.centre_id
      WHERE r.id = centre_role_permissions.role_id AND s.user_id = auth.uid()
    )
  );
