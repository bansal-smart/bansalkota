
-- Centre custom roles
CREATE TABLE public.centre_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (centre_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_roles TO authenticated;
GRANT ALL ON public.centre_roles TO service_role;
ALTER TABLE public.centre_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centre staff can view centre roles"
ON public.centre_roles FOR SELECT TO authenticated
USING (
  public.is_centre_staff(auth.uid(), centre_id)
  OR public.is_admin_or_super(auth.uid())
);

CREATE POLICY "Centre admins manage centre roles"
ON public.centre_roles FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_staff cs
    WHERE cs.user_id = auth.uid()
      AND cs.centre_id = centre_roles.centre_id
      AND cs.role = 'admin'
  )
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_staff cs
    WHERE cs.user_id = auth.uid()
      AND cs.centre_id = centre_roles.centre_id
      AND cs.role = 'admin'
  )
);

CREATE TRIGGER trg_centre_roles_updated
BEFORE UPDATE ON public.centre_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permissions per role per module
CREATE TABLE public.centre_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.centre_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_role_permissions TO authenticated;
GRANT ALL ON public.centre_role_permissions TO service_role;
ALTER TABLE public.centre_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centre staff can view role permissions"
ON public.centre_role_permissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.centre_roles cr
    WHERE cr.id = centre_role_permissions.role_id
      AND (
        public.is_centre_staff(auth.uid(), cr.centre_id)
        OR public.is_admin_or_super(auth.uid())
      )
  )
);

CREATE POLICY "Centre admins manage role permissions"
ON public.centre_role_permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.centre_roles cr
    WHERE cr.id = centre_role_permissions.role_id
      AND (
        public.is_admin_or_super(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.centre_staff cs
          WHERE cs.user_id = auth.uid()
            AND cs.centre_id = cr.centre_id
            AND cs.role = 'admin'
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.centre_roles cr
    WHERE cr.id = centre_role_permissions.role_id
      AND (
        public.is_admin_or_super(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.centre_staff cs
          WHERE cs.user_id = auth.uid()
            AND cs.centre_id = cr.centre_id
            AND cs.role = 'admin'
        )
      )
  )
);

CREATE TRIGGER trg_centre_role_permissions_updated
BEFORE UPDATE ON public.centre_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link a staff member to a custom role
ALTER TABLE public.centre_staff
  ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES public.centre_roles(id) ON DELETE SET NULL;
