-- Multi-image carousel for Test Series, modeled on landing_hero_banners'
-- shape (reorderable, active toggle, alt text, optional link) but scoped
-- per test_series_id rather than being a flat, homepage-only table — neither
-- landing_hero_banners (no scoping column) nor site_banners (one row per
-- page_key, not per dynamic entity) cleanly fit "many images per one test
-- series product". RLS delegates to test_series' own ownership rather than
-- duplicating role logic, and is written unconditionally for staff (no
-- centre_id IS NULL trap — see the 20260912070000 fix this directly learns
-- from).

CREATE TABLE public.test_series_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt text,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_series_images_test_series_id ON public.test_series_images (test_series_id);
CREATE INDEX idx_test_series_images_sort_order ON public.test_series_images (test_series_id, sort_order);

CREATE TRIGGER update_test_series_images_updated_at
  BEFORE UPDATE ON public.test_series_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_series_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view images of published test series"
ON public.test_series_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id AND ts.is_published = true
));

CREATE POLICY "Staff manage all test series images"
ON public.test_series_images FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Centre staff manage their own test series images"
ON public.test_series_images FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id
    AND ts.centre_id IS NOT NULL
    AND is_centre_staff(auth.uid(), ts.centre_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id
    AND ts.centre_id IS NOT NULL
    AND is_centre_staff(auth.uid(), ts.centre_id)
));

GRANT SELECT ON public.test_series_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_series_images TO authenticated;
GRANT ALL ON public.test_series_images TO service_role;
