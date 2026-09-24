-- Centre codes are numeric and may be one to four digits. Keeping this in the
-- database matches the Super Admin form and protects bulk/API updates too.
ALTER TABLE public.centres
  DROP CONSTRAINT IF EXISTS centres_centre_code_format_check;

ALTER TABLE public.centres
  ADD CONSTRAINT centres_centre_code_format_check
  CHECK (centre_code IS NULL OR centre_code ~ '^[0-9]{1,4}$');
