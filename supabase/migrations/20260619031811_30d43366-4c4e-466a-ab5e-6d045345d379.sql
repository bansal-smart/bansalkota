CREATE OR REPLACE FUNCTION public.admin_emails_for_user_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(_user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_emails_for_user_ids(uuid[]) TO authenticated;