
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_rank int;

ALTER TABLE public.toppers
  ADD COLUMN IF NOT EXISTS is_alumni boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_position text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS batch_year int;

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS sub_topic text;

ALTER TABLE public.test_questions
  ALTER COLUMN partial_marking SET DEFAULT true;

CREATE TABLE IF NOT EXISTS public.test_reattempt_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.test_attempts(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_reattempt_requests TO authenticated;
GRANT ALL ON public.test_reattempt_requests TO service_role;

ALTER TABLE public.test_reattempt_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own reattempt requests"
  ON public.test_reattempt_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Students create reattempt requests"
  ON public.test_reattempt_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins decide reattempt requests"
  ON public.test_reattempt_requests FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins delete reattempt requests"
  ON public.test_reattempt_requests FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_reattempt_updated
  BEFORE UPDATE ON public.test_reattempt_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_reattempt_test(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.test_reattempt_requests
    WHERE user_id = _user_id
      AND test_id = _test_id
      AND status = 'approved'
      AND (decided_at IS NULL OR decided_at > now() - interval '30 days')
  );
$$;

CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id uuid PRIMARY KEY,
  session_id text NOT NULL,
  device_label text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own session row"
  ON public.active_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_active_sessions_updated
  BEFORE UPDATE ON public.active_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
