
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cbt_password_set_at timestamptz;

-- Verify a student's CBT password against auth.users.encrypted_password.
-- Returns matching profile info (or empty) — no hashes leak out.
CREATE OR REPLACE FUNCTION public.cbt_verify_password(_roll text, _password text)
RETURNS TABLE(user_id uuid, full_name text, batch_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_hash text;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM public.profiles p
  WHERE p.roll_number = _roll
  LIMIT 1;

  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT u.encrypted_password INTO v_hash FROM auth.users u WHERE u.id = v_user_id;
  IF v_hash IS NULL THEN RETURN; END IF;

  IF v_hash = extensions.crypt(_password, v_hash) THEN
    RETURN QUERY
    SELECT p.user_id, p.full_name, p.batch_id
    FROM public.profiles p WHERE p.user_id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cbt_verify_password(text, text) TO anon, authenticated, service_role;
