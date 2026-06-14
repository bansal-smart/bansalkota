DO $$
DECLARE
  ids uuid[] := ARRAY['0c38162b-8188-4aff-af23-8f1d8d529380'::uuid, '877483f4-d95f-4aef-95bc-fe183513d523'::uuid];
  aid uuid;
BEGIN
  FOREACH aid IN ARRAY ids LOOP
    PERFORM public._recompute_attempt(aid);
    UPDATE public.test_attempts
       SET status = 'submitted',
           submitted_at = COALESCE(submitted_at, now()),
           reopened_reason = COALESCE(reopened_reason, '') || ' | Admin force-submitted (saved responses preserved)'
     WHERE id = aid;
  END LOOP;
END $$;