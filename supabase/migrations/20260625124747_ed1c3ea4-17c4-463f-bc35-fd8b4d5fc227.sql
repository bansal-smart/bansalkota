
CREATE TABLE public.achievement_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievement_posters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievement_posters TO authenticated;
GRANT ALL ON public.achievement_posters TO service_role;

ALTER TABLE public.achievement_posters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active posters"
ON public.achievement_posters FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage posters"
ON public.achievement_posters FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_achievement_posters_updated_at
BEFORE UPDATE ON public.achievement_posters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
