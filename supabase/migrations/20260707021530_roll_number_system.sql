-- Multi-Centre / HQ restructure — Phase 1, step 3: automatic roll-number assignment.
-- Franchise centres auto-assign rolls of the form {CITY_CODE}{CENTRE_CODE}{SEQ4},
-- e.g. BLR010001. Kota HQ is exempt (manual rolls). Called by student-creation edge
-- functions (service role); not exposed to end users.

CREATE OR REPLACE FUNCTION public.assign_roll_number(_centre_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_hq boolean;
  _city_code text;
  _centre_code text;
  _new_seq integer;
BEGIN
  SELECT is_hq, city_code, centre_code
    INTO _is_hq, _city_code, _centre_code
    FROM public.centres
    WHERE id = _centre_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Centre % not found', _centre_id;
  END IF;

  -- HQ (Kota) keeps manual roll numbers — no auto-generation.
  IF _is_hq THEN
    RETURN NULL;
  END IF;

  IF _city_code IS NULL OR _centre_code IS NULL THEN
    RAISE EXCEPTION 'Centre % has no city_code/centre_code set — assign one before enrolling students', _centre_id;
  END IF;

  -- Atomic per-centre increment (row lock held to end of tx).
  UPDATE public.centres
    SET roll_seq = roll_seq + 1
    WHERE id = _centre_id
    RETURNING roll_seq INTO _new_seq;

  RETURN upper(_city_code) || _centre_code || lpad(_new_seq::text, 4, '0');
END $$;

REVOKE ALL ON FUNCTION public.assign_roll_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_roll_number(uuid) TO service_role;
