CREATE OR REPLACE FUNCTION public.noop_manage_center_admin_marker()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT true
$$;