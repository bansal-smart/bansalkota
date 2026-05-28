
CREATE TABLE public.boost_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admit_card_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  date_of_birth DATE,
  class_level TEXT NOT NULL,
  target_exam TEXT NOT NULL,
  school_name TEXT,
  city TEXT,
  state TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  preferred_centre_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
  preferred_centre_label TEXT,
  exam_slot TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 99,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.boost_registrations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.boost_registrations TO authenticated;
GRANT ALL ON public.boost_registrations TO service_role;

ALTER TABLE public.boost_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit boost registration"
  ON public.boost_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins manage boost registrations"
  ON public.boost_registrations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users view own boost registration by email"
  ON public.boost_registrations FOR SELECT
  TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE INDEX idx_boost_registrations_created_at ON public.boost_registrations(created_at DESC);
CREATE INDEX idx_boost_registrations_status ON public.boost_registrations(status);
CREATE INDEX idx_boost_registrations_payment_status ON public.boost_registrations(payment_status);

CREATE TRIGGER update_boost_registrations_updated_at
  BEFORE UPDATE ON public.boost_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.boost_admit_seq START 1;

CREATE OR REPLACE FUNCTION public.set_boost_admit_card()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.admit_card_number IS NULL OR NEW.admit_card_number = '' THEN
    NEW.admit_card_number := 'BOOST-2026-' || LPAD(nextval('public.boost_admit_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_boost_admit_card_trigger
  BEFORE INSERT ON public.boost_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_boost_admit_card();

CREATE OR REPLACE FUNCTION public.notify_boost_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New BOOST registration',
    NEW.full_name || ' (' || NEW.class_level || ' · ' || NEW.target_exam || ') registered for BOOST. Admit card: ' || NEW.admit_card_number,
    'boost_registration',
    '/admin/boost'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_boost_registration_trigger
  AFTER INSERT ON public.boost_registrations
  FOR EACH ROW EXECUTE FUNCTION public.notify_boost_registration();
