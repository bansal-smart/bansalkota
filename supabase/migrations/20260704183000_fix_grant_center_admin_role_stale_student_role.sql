-- grant_center_admin_role() has always been purely additive (INSERT ... ON
-- CONFLICT DO NOTHING), so a user who already held the default 'student'
-- user_roles row (e.g. bulk-imported as a student earlier) keeps that row
-- forever after being added to centre_staff — leaving them with BOTH
-- 'student' and 'center_admin' rows. That stale 'student' row then leaks
-- centre admins into any admin query that filters user_roles by
-- role = 'student' (e.g. the monthly student report list).
--
-- Fix: clear the default 'student' row whenever centre_admin is granted,
-- same pattern already used by admin_set_user_role() for admin promotions.
CREATE OR REPLACE FUNCTION public.grant_center_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'student'::app_role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'center_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;

-- One-off cleanup: remove the stale 'student' row for every account that
-- currently holds both 'student' and 'center_admin' (or is centre staff via
-- the renamed centre_staff table), so already-affected accounts stop
-- appearing in student-only lists retroactively.
DELETE FROM public.user_roles ur
WHERE ur.role = 'student'::app_role
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role <> 'student'::app_role
  );
