
-- 1) center_gallery
CREATE TABLE public.center_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  kind text NOT NULL DEFAULT 'achievement' CHECK (kind IN ('achievement','event')),
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX center_gallery_center_idx ON public.center_gallery(center_id, sort_order);

GRANT SELECT ON public.center_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_gallery TO authenticated;
GRANT ALL ON public.center_gallery TO service_role;

ALTER TABLE public.center_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published gallery"
  ON public.center_gallery FOR SELECT
  USING (is_published = true);

CREATE POLICY "Centre staff & admins manage gallery"
  ON public.center_gallery FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_center_staff(auth.uid(), center_id)
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.is_center_staff(auth.uid(), center_id)
  );

CREATE TRIGGER trg_center_gallery_updated
  BEFORE UPDATE ON public.center_gallery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) center_updates
CREATE TABLE public.center_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX center_updates_center_idx ON public.center_updates(center_id, posted_at DESC);

GRANT SELECT ON public.center_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_updates TO authenticated;
GRANT ALL ON public.center_updates TO service_role;

ALTER TABLE public.center_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published updates"
  ON public.center_updates FOR SELECT
  USING (is_published = true);

CREATE POLICY "Centre staff & admins manage updates"
  ON public.center_updates FOR ALL
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.is_center_staff(auth.uid(), center_id)
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.is_center_staff(auth.uid(), center_id)
  );

CREATE TRIGGER trg_center_updates_updated
  BEFORE UPDATE ON public.center_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
