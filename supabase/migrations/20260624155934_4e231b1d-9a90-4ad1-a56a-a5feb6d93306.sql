CREATE TABLE public.landing_hero_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  alt text,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_hero_banners TO authenticated;
GRANT ALL ON public.landing_hero_banners TO service_role;

ALTER TABLE public.landing_hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active landing hero banners"
  ON public.landing_hero_banners FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage landing hero banners"
  ON public.landing_hero_banners FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_landing_hero_banners_updated
  BEFORE UPDATE ON public.landing_hero_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_landing_hero_banners_sort ON public.landing_hero_banners (sort_order, created_at);