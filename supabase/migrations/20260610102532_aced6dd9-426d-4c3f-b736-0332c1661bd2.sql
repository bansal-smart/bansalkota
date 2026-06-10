
DROP INDEX IF EXISTS public.site_banners_single_active_idx;
DELETE FROM public.site_banners WHERE page_key = 'mentorship';
