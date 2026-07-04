-- boost_registrations only has a SELECT policy for authenticated users whose
-- email matches their JWT — anonymous submitters (and authenticated ones whose
-- typed email differs from their login email) have no applicable SELECT policy,
-- so `.insert().select().single()` fails RLS on the RETURNING clause exactly
-- like course_enquiries did. Unlike that table, we DO need a server-computed
-- value back (admit_card_number, assigned by a trigger via a sequence), so we
-- can't just skip .select() entirely. This RPC narrowly returns only that one
-- field for a given row id — safe since id is an unguessable random UUID the
-- caller only has because they just generated/inserted it themselves.
CREATE OR REPLACE FUNCTION public.get_boost_admit_card(_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admit_card_number FROM public.boost_registrations WHERE id = _id
$$;

GRANT EXECUTE ON FUNCTION public.get_boost_admit_card(uuid) TO anon, authenticated;
