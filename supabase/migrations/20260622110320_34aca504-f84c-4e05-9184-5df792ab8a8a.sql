ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS class_level text;
ALTER TABLE public.enquiries ALTER COLUMN email DROP NOT NULL;