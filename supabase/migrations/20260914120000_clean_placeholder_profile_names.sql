-- Remove known placeholder names from profiles without deleting Auth accounts.
-- These accounts may be real students whose actual name still needs to be
-- collected; clearing the value prevents dummy text leaking into forms,
-- exports, reports, and certificates.

UPDATE public.profiles
SET full_name = NULL,
    updated_at = now()
WHERE lower(trim(full_name)) IN ('dummy entry', 'test', 'test user', 'n/a', 'tbd', 'demo')
   OR lower(trim(full_name)) LIKE 'dummy %';