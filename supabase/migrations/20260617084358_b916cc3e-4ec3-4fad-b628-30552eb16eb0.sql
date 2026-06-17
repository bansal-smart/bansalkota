
-- ============ landing_page_config ============
CREATE TABLE public.landing_page_config (
  id text PRIMARY KEY DEFAULT 'default',
  hero jsonb NOT NULL DEFAULT '{}'::jsonb,
  overview text DEFAULT '',
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.landing_page_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_config TO authenticated;
GRANT ALL ON public.landing_page_config TO service_role;

ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lpc_public_read" ON public.landing_page_config
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "lpc_admin_insert" ON public.landing_page_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "lpc_admin_update" ON public.landing_page_config
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "lpc_admin_delete" ON public.landing_page_config
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER landing_page_config_updated_at
  BEFORE UPDATE ON public.landing_page_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row
INSERT INTO public.landing_page_config (id, hero, overview, highlights, outcomes, details, faqs, contact, form_config)
VALUES (
  'default',
  jsonb_build_object(
    'banner_url', '',
    'title', 'Bansal Crash Course 2026',
    'subtitle', 'Crack JEE / NEET with India''s most trusted classroom legacy.',
    'start_date', 'Starts 1 July 2026',
    'seats_left', 50,
    'seats_enabled', true,
    'early_bird_deadline', null,
    'early_bird_enabled', false,
    'cta_label', 'Register Now'
  ),
  'A focused, exam-oriented program designed by Bansal''s most experienced faculty to maximise your score in the shortest time.',
  '[
    {"icon":"Zap","title":"Top Faculty","text":"Learn from the same teachers who have shaped IIT toppers for decades."},
    {"icon":"Target","title":"Exam-Focused","text":"Every lecture, DPP and test mirrors the latest JEE / NEET pattern."},
    {"icon":"Trophy","title":"Proven Results","text":"Thousands of selections — join the legacy that delivers."}
  ]'::jsonb,
  '["Master high-weightage chapters","Solve PYQs with shortcut techniques","Build exam temperament with full-length mocks","Personal doubt resolution by mentors"]'::jsonb,
  jsonb_build_object(
    'eligibility', 'Class 11, 12 & Droppers',
    'duration', '12 Weeks',
    'mode', 'Hybrid (Online + Offline)',
    'batch_start', '1 July 2026',
    'language', 'English & Hindi',
    'schedule', 'Mon–Sat, 5 PM – 8 PM IST'
  ),
  '[
    {"q":"Who can enrol?","a":"Students of Class 11, 12 and droppers preparing for JEE or NEET 2026."},
    {"q":"Will recordings be available?","a":"Yes, every live class is recorded and accessible inside the student portal."},
    {"q":"Is there a refund policy?","a":"Refunds are governed by our standard refund policy available on the site."}
  ]'::jsonb,
  jsonb_build_object(
    'phone', '+91 90000 00000',
    'whatsapp', '+91 90000 00000',
    'email', 'admissions@bansalclasses.com',
    'address', 'Bansal Classes, Kota, Rajasthan'
  ),
  jsonb_build_object(
    'show_city', true,
    'show_message', false,
    'submit_label', 'Reserve My Seat',
    'success_message', 'Thank you! Our counsellor will reach out within 24 hours.'
  )
) ON CONFLICT (id) DO NOTHING;

-- ============ landing_page_leads ============
CREATE TABLE public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  class_level text,
  city text,
  message text,
  source text NOT NULL DEFAULT 'landing_new',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_page_leads_created_idx ON public.landing_page_leads (created_at DESC);
CREATE INDEX landing_page_leads_phone_idx ON public.landing_page_leads (phone);
CREATE INDEX landing_page_leads_status_idx ON public.landing_page_leads (status);

GRANT INSERT ON public.landing_page_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_leads TO authenticated;
GRANT ALL ON public.landing_page_leads TO service_role;

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lpl_public_insert" ON public.landing_page_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(full_name) BETWEEN 1 AND 120
    AND char_length(phone) BETWEEN 6 AND 20
    AND (email IS NULL OR char_length(email) <= 200)
    AND (message IS NULL OR char_length(message) <= 1000)
  );

CREATE POLICY "lpl_admin_select" ON public.landing_page_leads
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "lpl_admin_update" ON public.landing_page_leads
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "lpl_admin_delete" ON public.landing_page_leads
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER landing_page_leads_updated_at
  BEFORE UPDATE ON public.landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins on new lead
CREATE OR REPLACE FUNCTION public.notify_landing_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New campaign lead: ' || NEW.full_name,
    'Phone: ' || NEW.phone || COALESCE(' · ' || NEW.class_level, '') || COALESCE(' · ' || NEW.city, ''),
    'landing_lead',
    '/admin/landing-leads'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER landing_page_leads_notify
  AFTER INSERT ON public.landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_landing_lead();
