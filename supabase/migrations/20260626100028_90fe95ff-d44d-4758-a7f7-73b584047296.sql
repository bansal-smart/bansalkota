CREATE TABLE public.centre_carousel_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.centre_carousel_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_carousel_banners TO authenticated;
GRANT ALL ON public.centre_carousel_banners TO service_role;

ALTER TABLE public.centre_carousel_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active centre carousel banners"
  ON public.centre_carousel_banners FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.centre_staff cs WHERE cs.user_id = auth.uid() AND cs.centre_id = centre_carousel_banners.centre_id));

CREATE POLICY "Centre staff and admins manage carousel banners"
  ON public.centre_carousel_banners FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.centre_staff cs WHERE cs.user_id = auth.uid() AND cs.centre_id = centre_carousel_banners.centre_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.centre_staff cs WHERE cs.user_id = auth.uid() AND cs.centre_id = centre_carousel_banners.centre_id)
  );

CREATE INDEX idx_centre_carousel_banners_centre ON public.centre_carousel_banners(centre_id, sort_order);

CREATE TRIGGER update_centre_carousel_banners_updated_at
  BEFORE UPDATE ON public.centre_carousel_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();