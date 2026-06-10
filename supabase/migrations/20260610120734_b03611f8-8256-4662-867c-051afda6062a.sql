
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.lookup_user_id_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email(text) TO authenticated;
