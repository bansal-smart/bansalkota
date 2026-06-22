ALTER TABLE public.landing_page_config
  ADD COLUMN IF NOT EXISTS top_banner jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS about jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cta jsonb NOT NULL DEFAULT '{}'::jsonb;