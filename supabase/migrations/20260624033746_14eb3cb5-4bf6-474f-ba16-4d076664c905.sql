ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone_e164 TEXT;