
-- ============== Storage bucket for admin-managed marketing content ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read site-content"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-content');

CREATE POLICY "Admins manage site-content"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'site-content'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  bucket_id = 'site-content'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- ============== Centers ==============
CREATE TABLE public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  city text NOT NULL,
  area text,
  state text NOT NULL,
  region text NOT NULL DEFAULT 'North',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text,
  is_hq boolean NOT NULL DEFAULT false,
  established integer,
  theme text NOT NULL DEFAULT 'metro',
  image_url text,
  verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.centers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centers TO authenticated;
GRANT ALL ON public.centers TO service_role;

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published centers" ON public.centers
FOR SELECT USING (is_published = true OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage centers" ON public.centers
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_centers_updated BEFORE UPDATE ON public.centers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Toppers / Achievements ==============
CREATE TABLE public.toppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exam text NOT NULL,
  rank_label text,
  year integer,
  score text,
  photo_url text,
  quote text,
  city text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.toppers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.toppers TO authenticated;
GRANT ALL ON public.toppers TO service_role;

ALTER TABLE public.toppers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published toppers" ON public.toppers
FOR SELECT USING (is_published = true OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage toppers" ON public.toppers
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_toppers_updated BEFORE UPDATE ON public.toppers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Site Banners (hero banners per public page) ==============
CREATE TABLE public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  image_url text,
  headline text,
  subheading text,
  cta_label text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;
GRANT ALL ON public.site_banners TO service_role;

ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active banners" ON public.site_banners
FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage banners" ON public.site_banners
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_site_banners_updated BEFORE UPDATE ON public.site_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
