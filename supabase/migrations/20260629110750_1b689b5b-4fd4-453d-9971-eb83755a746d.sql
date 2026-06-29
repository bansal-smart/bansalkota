
-- Allow centre staff (without a custom role, i.e. the centre admin login) to manage centre_roles & permissions for their centre.
DROP POLICY IF EXISTS "Centre admins manage centre roles" ON public.centre_roles;
CREATE POLICY "Centre admins manage centre roles"
  ON public.centre_roles FOR ALL
  USING (
    is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_staff cs
      WHERE cs.user_id = auth.uid()
        AND cs.centre_id = centre_roles.centre_id
        AND cs.custom_role_id IS NULL
    )
  )
  WITH CHECK (
    is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_staff cs
      WHERE cs.user_id = auth.uid()
        AND cs.centre_id = centre_roles.centre_id
        AND cs.custom_role_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Centre admins manage role permissions" ON public.centre_role_permissions;
CREATE POLICY "Centre admins manage role permissions"
  ON public.centre_role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.centre_roles cr
      WHERE cr.id = centre_role_permissions.role_id
        AND (
          is_admin_or_super(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.centre_staff cs
            WHERE cs.user_id = auth.uid()
              AND cs.centre_id = cr.centre_id
              AND cs.custom_role_id IS NULL
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centre_roles cr
      WHERE cr.id = centre_role_permissions.role_id
        AND (
          is_admin_or_super(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.centre_staff cs
            WHERE cs.user_id = auth.uid()
              AND cs.centre_id = cr.centre_id
              AND cs.custom_role_id IS NULL
          )
        )
    )
  );

-- Allow centre admins to manage their centre's staff rows (insert/update/delete) so they can attach new logins & assign custom roles.
DROP POLICY IF EXISTS "Centre admins manage own centre staff" ON public.centre_staff;
CREATE POLICY "Centre admins manage own centre staff"
  ON public.centre_staff FOR ALL
  USING (
    is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_staff cs2
      WHERE cs2.user_id = auth.uid()
        AND cs2.centre_id = centre_staff.centre_id
        AND cs2.custom_role_id IS NULL
    )
  )
  WITH CHECK (
    is_admin_or_super(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.centre_staff cs2
      WHERE cs2.user_id = auth.uid()
        AND cs2.centre_id = centre_staff.centre_id
        AND cs2.custom_role_id IS NULL
    )
  );

-- Centre admins should also be able to read all staff rows in their own centre.
DROP POLICY IF EXISTS "Centre admins read own centre staff" ON public.centre_staff;
CREATE POLICY "Centre admins read own centre staff"
  ON public.centre_staff FOR SELECT
  USING (
    is_admin_or_super(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.centre_staff cs2
      WHERE cs2.user_id = auth.uid()
        AND cs2.centre_id = centre_staff.centre_id
        AND cs2.custom_role_id IS NULL
    )
  );
