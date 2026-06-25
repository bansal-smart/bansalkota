
CREATE TABLE public.boost_settings (
  id uuid PRIMARY KEY,
  exam_dates date[] NOT NULL DEFAULT '{}',
  price_inr integer NOT NULL DEFAULT 99,
  apply_deadline_time time NOT NULL DEFAULT '18:00',
  apply_deadline_days_before smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.boost_settings TO authenticated;
GRANT ALL ON public.boost_settings TO service_role;

ALTER TABLE public.boost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boost_settings public read" ON public.boost_settings
  FOR SELECT USING (true);

CREATE POLICY "boost_settings admin write" ON public.boost_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_boost_settings_updated_at
  BEFORE UPDATE ON public.boost_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.boost_settings (id, exam_dates, price_inr, apply_deadline_time, apply_deadline_days_before)
VALUES ('a0000000-0000-0000-0000-0000000b0057', ARRAY['2026-07-05'::date, '2026-07-12'::date], 99, '18:00', 1);
