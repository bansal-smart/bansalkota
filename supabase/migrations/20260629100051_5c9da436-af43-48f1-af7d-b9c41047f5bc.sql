
-- 1) Leadership honorific
ALTER TABLE public.leadership_profiles
  ADD COLUMN IF NOT EXISTS honorific TEXT DEFAULT '';

UPDATE public.leadership_profiles SET honorific = 'Sir'
  WHERE slug IN ('vk-bansal','sameer-bansal') AND COALESCE(honorific,'') = '';
UPDATE public.leadership_profiles SET honorific = 'Ma''am'
  WHERE slug IN ('neelam-bansal','mahima-bansal') AND COALESCE(honorific,'') = '';

-- 2) Built-In Advantages
CREATE TABLE IF NOT EXISTS public.landing_advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  link_url TEXT NOT NULL DEFAULT '/',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_advantages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.landing_advantages TO authenticated;
GRANT ALL ON public.landing_advantages TO service_role;

ALTER TABLE public.landing_advantages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active advantages"
  ON public.landing_advantages FOR SELECT
  USING (is_active = TRUE OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage advantages"
  ON public.landing_advantages FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_landing_advantages_updated
  BEFORE UPDATE ON public.landing_advantages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.landing_advantages (title, image_url, alt_text, link_url, sort_order, is_active) VALUES
  ('Personal Mentorship',
   'https://zmkgboiqubtowmionplq.supabase.co/storage/v1/object/public/site-content/feature-mentorship.webp',
   'Personal Mentorship — One-to-one attention, stronger concepts, better results',
   '#lead-form', 1, TRUE),
  ('Track Progress',
   'https://zmkgboiqubtowmionplq.supabase.co/storage/v1/object/public/site-content/feature-track-progress.webp',
   'Track Progress. Improve Faster — Real-time academic insights',
   '/dashboard', 2, TRUE);

-- 3) Blogs
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read blog categories"
  ON public.blog_categories FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage blog categories"
  ON public.blog_categories FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  author_id UUID,
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON public.blog_posts(status, published_at DESC);

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage posts"
  ON public.blog_posts FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_blog_posts_updated
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
