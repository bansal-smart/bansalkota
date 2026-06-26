
REVOKE EXECUTE ON FUNCTION public.is_centre_staff_for_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_centre_staff_for_student(uuid, uuid) TO authenticated, service_role;
