-- is_centre_admin_of() still referenced centre_staff.custom_role_id, a column
-- dropped by migration 20260706163111 when role_assignments replaced it.
-- Confirmed broken live: SELECT public.is_centre_admin_of(...) throws
-- "column custom_role_id does not exist". This backs 5 RLS policies
-- (centre_staff, role_assignments) and admin-create-center-user's authz
-- check, so every real franchise centre_admin currently cannot manage their
-- own centre's staff at all. Restore the same "unrestricted centre admin"
-- semantic using role_assignments instead (matches has_permission()'s rule:
-- a centre_staff row with no role_assignments row = full access).
CREATE OR REPLACE FUNCTION public.is_centre_admin_of(_user_id uuid, _centre_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_staff cs
    WHERE cs.user_id = _user_id
      AND cs.centre_id = _centre_id
      AND NOT EXISTS (SELECT 1 FROM public.role_assignments ra WHERE ra.user_id = cs.user_id)
  );
$$;
