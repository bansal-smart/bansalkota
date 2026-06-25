
CREATE TABLE public.gallery_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('image','video')),
  title text NOT NULL,
  video_url text,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_albums TO authenticated;
GRANT SELECT ON public.gallery_albums TO anon;
GRANT ALL ON public.gallery_albums TO service_role;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active albums" ON public.gallery_albums FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage albums" ON public.gallery_albums FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.gallery_album_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_album_images TO authenticated;
GRANT SELECT ON public.gallery_album_images TO anon;
GRANT ALL ON public.gallery_album_images TO service_role;
ALTER TABLE public.gallery_album_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view album images" ON public.gallery_album_images FOR SELECT USING (true);
CREATE POLICY "Admins manage album images" ON public.gallery_album_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX idx_gallery_album_images_album ON public.gallery_album_images(album_id, sort_order);
CREATE INDEX idx_gallery_albums_kind ON public.gallery_albums(kind, sort_order);
