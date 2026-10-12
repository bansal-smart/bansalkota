-- Tests created while two centres were flagged HQ got a NULL centre_id (the
-- app's HQ lookup errored on multiple rows). NULL is read as "global" by every
-- centre, so these Kota tests leaked to franchise centres. Give them an owner.
UPDATE public.tests
SET centre_id = (SELECT id FROM public.centres WHERE is_hq = true ORDER BY created_at LIMIT 1)
WHERE centre_id IS NULL AND is_global = false;
