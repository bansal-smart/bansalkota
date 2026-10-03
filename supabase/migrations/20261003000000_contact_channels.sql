-- Contact Channels: editable "Direct Channels" list shown on the public
-- Contact page. Previously hardcoded in src/pages/ContactPage.tsx; now a
-- super-admin-editable list (mirrors platform_settings' RLS pattern).
CREATE TABLE public.contact_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'phone' CHECK (kind IN ('phone', 'email', 'whatsapp')),
  label text NOT NULL,
  value text NOT NULL,
  href text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_channels public read"
  ON public.contact_channels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins insert contact channels"
  ON public.contact_channels FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins update contact channels"
  ON public.contact_channels FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins delete contact channels"
  ON public.contact_channels FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER contact_channels_updated_at
  BEFORE UPDATE ON public.contact_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX contact_channels_display_order_idx ON public.contact_channels (display_order);

INSERT INTO public.contact_channels (kind, label, value, href, display_order) VALUES
  ('phone', 'Admissions', '+91 9773343246', 'tel:+919773343246', 0),
  ('phone', 'Admissions Alt.', '+91 8003045222', 'tel:+918003045222', 1),
  ('phone', 'HR', '+91 8375015384', 'tel:+918375015384', 2),
  ('phone', 'Franchise', '+91 9119321345', 'tel:+919119321345', 3),
  ('phone', 'Franchise Alt.', '+91 9001822790', 'tel:+919001822790', 4),
  ('phone', 'BFTP', '+91 8003046222', 'tel:+918003046222', 5),
  ('email', 'Email', 'admin@bansal.ac.in', 'mailto:admin@bansal.ac.in', 6),
  ('whatsapp', 'WhatsApp', 'Chat with us', 'https://wa.me/919773343246', 7);
