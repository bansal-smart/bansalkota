ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_courses_sort_order ON public.courses(sort_order);
-- seed initial order by created_at desc so newest gets lowest number
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) * 10 AS rn FROM public.courses
)
UPDATE public.courses c SET sort_order = ranked.rn FROM ranked WHERE c.id = ranked.id AND c.sort_order = 0;