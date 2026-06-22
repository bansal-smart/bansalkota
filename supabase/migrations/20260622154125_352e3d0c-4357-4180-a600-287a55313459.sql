
-- profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- phone_otps (backend-only)
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','login','password_reset','sensitive_action')),
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  ip text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_otps_phone_purpose_idx ON public.phone_otps(phone, purpose, created_at DESC);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phone_otps service only" ON public.phone_otps FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- phone_verifications
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_verifications_user_idx ON public.phone_verifications(user_id, verified_at DESC);
GRANT SELECT ON public.phone_verifications TO authenticated;
GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phone_verifications own" ON public.phone_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- sms_send_log
CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone text NOT NULL,
  template_name text NOT NULL,
  vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_body text,
  purpose text,
  provider_msg_id text,
  status text NOT NULL DEFAULT 'pending',
  error_code text,
  error_message text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  broadcast_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_send_log_phone_idx ON public.sms_send_log(to_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_send_log_broadcast_idx ON public.sms_send_log(broadcast_id);
GRANT SELECT ON public.sms_send_log TO authenticated;
GRANT ALL ON public.sms_send_log TO service_role;
ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_send_log admin read" ON public.sms_send_log FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- sms_broadcasts
CREATE TABLE IF NOT EXISTS public.sms_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  template_name text NOT NULL,
  vars_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','running','completed','failed','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_broadcasts TO authenticated;
GRANT ALL ON public.sms_broadcasts TO service_role;
ALTER TABLE public.sms_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_broadcasts admin all" ON public.sms_broadcasts FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE TRIGGER sms_broadcasts_set_updated BEFORE UPDATE ON public.sms_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- sms_broadcast_recipients
CREATE TABLE IF NOT EXISTS public.sms_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.sms_broadcasts(id) ON DELETE CASCADE,
  user_id uuid,
  phone text NOT NULL,
  vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  provider_msg_id text,
  error_code text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_broadcast_recipients_broadcast_idx ON public.sms_broadcast_recipients(broadcast_id, status);
GRANT SELECT ON public.sms_broadcast_recipients TO authenticated;
GRANT ALL ON public.sms_broadcast_recipients TO service_role;
ALTER TABLE public.sms_broadcast_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_broadcast_recipients admin read" ON public.sms_broadcast_recipients FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));
