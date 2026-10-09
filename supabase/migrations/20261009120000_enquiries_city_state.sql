-- The welcome popup now captures City and State alongside class level, but
-- enquiries previously had no columns for either (only the india/dubai
-- "region" flag) — add them so this data isn't lost into free-text `message`.
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;
