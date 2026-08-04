-- Franchise roll numbers are alphanumeric (e.g. KOLH0001) and always generated
-- uppercase by assign_roll_number(), but CBT kiosk login previously did an
-- exact-case match, so a student typing "kolh0001" (lowercase, easy to do on
-- a phone with autocapitalize quirks) got "Invalid roll number or password"
-- even with the right credentials. Match case-insensitively; numeric Kota
-- rolls are unaffected since upper() is a no-op on digits.
create or replace function public.cbt_verify_password(_roll text, _password text)
returns table(user_id uuid, full_name text, batch_id uuid)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
DECLARE
  v_user_id uuid;
  v_hash text;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM public.profiles p
  WHERE upper(p.roll_number) = upper(_roll)
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
$function$;
