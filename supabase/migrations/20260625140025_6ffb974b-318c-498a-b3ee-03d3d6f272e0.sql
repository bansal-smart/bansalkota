
ALTER TABLE public.test_series
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS included_services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subjects_covered text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn FROM public.books
)
UPDATE public.books b SET sort_order = ranked.rn FROM ranked WHERE b.id = ranked.id AND b.sort_order = 0;
