-- Fix "nuclues-jee" -> "nucleus-jee" slug typo flagged in the client's SEO
-- review (indexed URL /courses/nuclues-jee). The old slug is kept alive via
-- a client-side redirect in CourseOrCentreRoute.tsx (LEGACY_SLUG_REDIRECTS).
UPDATE public.courses
SET slug = 'nucleus-jee'
WHERE slug = 'nuclues-jee';
