ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS import_method text NOT NULL DEFAULT 'master';
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS stem_image_url text;