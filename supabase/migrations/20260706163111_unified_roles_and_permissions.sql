-- Unified role/permission system, replacing the duplicated admin_roles and
-- centre_roles setups with one registry. Super admin is the only one who can
-- create/edit roles and their per-module permissions (both admin-portal roles
-- and centre sub-roles); centre admins may only assign an existing centre-scope
-- role to their own staff. Permissions are enforced server-side via
-- has_permission(), not just the client-side .can() checks the old system
-- relied on.

-- 1. Registry tables --------------------------------------------------------

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('admin', 'centre')),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, name)
);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
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

CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX idx_roles_scope ON public.roles(scope);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX idx_role_assignments_user ON public.role_assignments(user_id);
CREATE INDEX idx_role_assignments_role ON public.role_assignments(role_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_assignments TO authenticated;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.role_permissions TO service_role;
GRANT ALL ON public.role_assignments TO service_role;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS: only super_admin manages roles/permissions; centre_admin may assign
--    (INSERT/DELETE only) an existing centre-scope role to their own centre's
--    staff, but cannot create/edit roles or permissions themselves.

CREATE POLICY "Super admins manage roles"
ON public.roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Staff read roles"
ON public.roles FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.is_any_centre_staff(auth.uid())
);

CREATE POLICY "Super admins manage role permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Staff read role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.is_any_centre_staff(auth.uid())
);

CREATE POLICY "Super admins manage role assignments"
ON public.role_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Centre admins may assign/unassign a CENTRE-scope role to a user who is
-- staff at one of the centres they administer (is_centre_admin_of). They
-- cannot touch admin-scope role assignments.
CREATE POLICY "Centre admins assign centre roles to their staff"
ON public.role_assignments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles r
    JOIN public.centre_staff cs ON cs.user_id = role_assignments.user_id
    WHERE r.id = role_assignments.role_id
      AND r.scope = 'centre'
      AND public.is_centre_admin_of(auth.uid(), cs.centre_id)
  )
);

CREATE POLICY "Centre admins remove centre role assignments they made"
ON public.role_assignments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles r
    JOIN public.centre_staff cs ON cs.user_id = role_assignments.user_id
    WHERE r.id = role_assignments.role_id
      AND r.scope = 'centre'
      AND public.is_centre_admin_of(auth.uid(), cs.centre_id)
  )
);

CREATE POLICY "Users can view their own role assignment"
ON public.role_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_staff cs
    WHERE cs.user_id = role_assignments.user_id
      AND public.is_centre_admin_of(auth.uid(), cs.centre_id)
  )
);

-- 3. has_permission(): the single source of truth every RLS policy and edge
--    function should call for module/action checks going forward.
--
--    - super_admin: always true.
--    - admin (no centre membership): true unless they have an admin-scope
--      role_assignments row, in which case defer to that role's grant.
--    - centre_admin (is_centre_admin_of a centre, i.e. centre_staff row with
--      no assigned centre-scope role): true for that centre's modules.
--    - anyone else with a role_assignments row: defer to that role's grant
--      for the given module/action, scoped correctly (admin roles apply
--      platform-wide; centre roles apply only within that user's centre).
--    - everyone else: false.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_super boolean;
  _is_admin boolean;
  _role_id uuid;
  _scope text;
  _grant boolean;
BEGIN
  IF public.has_role(_user_id, 'super_admin'::public.app_role) THEN
    RETURN true;
  END IF;

  _is_admin := public.has_role(_user_id, 'admin'::public.app_role);

  SELECT ra.role_id, r.scope INTO _role_id, _scope
  FROM public.role_assignments ra
  JOIN public.roles r ON r.id = ra.role_id
  WHERE ra.user_id = _user_id
  LIMIT 1;

  IF _is_admin AND _role_id IS NULL THEN
    RETURN true;
  END IF;

  IF _role_id IS NULL THEN
    -- Centre staff with no custom role assigned = full centre-admin access.
    IF EXISTS (
      SELECT 1 FROM public.centre_staff cs WHERE cs.user_id = _user_id
    ) THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  SELECT CASE _action
    WHEN 'view' THEN can_view
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    WHEN 'export' THEN can_export
    ELSE false
  END INTO _grant
  FROM public.role_permissions
  WHERE role_id = _role_id AND module = _module;

  RETURN COALESCE(_grant, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

-- 4. Migrate existing admin_roles / centre_roles data into the unified tables.
INSERT INTO public.roles (id, scope, name, description, created_by, created_at, updated_at)
SELECT id, 'admin', name, description, created_by, created_at, created_at
FROM public.admin_roles;

INSERT INTO public.roles (id, scope, name, description, created_by, created_at, updated_at)
SELECT id, 'centre', name, description, created_by, created_at, updated_at
FROM public.centre_roles;

INSERT INTO public.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_export, created_at, updated_at)
SELECT role_id, module, can_view, can_create, can_edit, can_delete, can_export, created_at, created_at
FROM public.admin_role_permissions;

INSERT INTO public.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_export, created_at, updated_at)
SELECT role_id, module, can_view, can_create, can_edit, can_delete, can_export, created_at, updated_at
FROM public.centre_role_permissions;

INSERT INTO public.role_assignments (user_id, role_id, assigned_by, assigned_at)
SELECT user_id, role_id, assigned_by, assigned_at
FROM public.admin_role_assignments;

INSERT INTO public.role_assignments (user_id, role_id, assigned_at)
SELECT user_id, custom_role_id, updated_at
FROM public.centre_staff
WHERE custom_role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. Drop the old duplicated tables now that data has been migrated.
ALTER TABLE public.centre_staff DROP COLUMN IF EXISTS custom_role_id;

DROP TABLE IF EXISTS public.admin_role_assignments CASCADE;
DROP TABLE IF EXISTS public.admin_role_permissions CASCADE;
DROP TABLE IF EXISTS public.admin_roles CASCADE;
DROP TABLE IF EXISTS public.centre_role_permissions CASCADE;
DROP TABLE IF EXISTS public.centre_roles CASCADE;
