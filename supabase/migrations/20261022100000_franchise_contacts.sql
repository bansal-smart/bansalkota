-- Editable "Franchise" contacts shown under Direct Channels on the public
-- Contact page. Super-admin write, public read (mirrors contact_channels).
CREATE TABLE public.franchise_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  phone text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.franchise_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franchise_contacts public read"
  ON public.franchise_contacts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "franchise_contacts super admin write"
  ON public.franchise_contacts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

GRANT SELECT ON public.franchise_contacts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.franchise_contacts TO authenticated;

CREATE TRIGGER franchise_contacts_updated_at
  BEFORE UPDATE ON public.franchise_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.franchise_contacts (region, name, role, phone, display_order) VALUES
  ('Kota H.O.', 'Sparsh Dwivedi', 'Head, New Ventures', '9001822790', 0),
  ('Kota H.O.', 'Senior Executive', 'New Ventures', '9119321345', 1),
  ('Karnataka Business Associate', 'Anand Laxmikant Agroya', 'Director', '9028172611', 2),
  ('Karnataka Business Associate', 'B.S. Krishna', 'Operations Head', '9028172613', 3);

NOTIFY pgrst, 'reload schema';
