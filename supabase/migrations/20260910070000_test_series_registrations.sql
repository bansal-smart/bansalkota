-- Lead-capture registration form ahead of Test Series checkout, mirroring the
-- BOOST registration pattern but keeping payment truth in `orders` (this flow
-- reuses the existing authenticated cashfree-create-order/test_series
-- checkout, unlike BOOST's separate anonymous payment path) rather than
-- duplicating payment_status/amount columns onto the registration row.

CREATE TABLE public.test_series_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  test_series_title text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  class_level text NOT NULL,
  target_exam text,
  school_name text,
  city text,
  state text,
  parent_name text,
  parent_phone text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'registered',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_series_registrations_status_check CHECK (status IN ('registered', 'cancelled'))
);

CREATE INDEX idx_test_series_registrations_created_at ON public.test_series_registrations (created_at);
CREATE INDEX idx_test_series_registrations_test_series_id ON public.test_series_registrations (test_series_id);
CREATE INDEX idx_test_series_registrations_status ON public.test_series_registrations (status);
CREATE INDEX idx_test_series_registrations_user_id ON public.test_series_registrations (user_id);
CREATE INDEX idx_test_series_registrations_order_id ON public.test_series_registrations (order_id);

CREATE TRIGGER update_test_series_registrations_updated_at
  BEFORE UPDATE ON public.test_series_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_series_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own test series registration"
  ON public.test_series_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own test series registration"
  ON public.test_series_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage test series registrations"
  ON public.test_series_registrations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

GRANT INSERT, SELECT ON public.test_series_registrations TO authenticated;
GRANT ALL ON public.test_series_registrations TO service_role;

-- Attaches the order created by the existing authenticated Cashfree checkout
-- back onto the registration row. A SECURITY DEFINER function (rather than a
-- broader UPDATE grant to `authenticated`) so a user can only ever link an
-- order that is both their own registration AND their own order — Postgres
-- RLS alone can't express "may update only this one column, only once,
-- only when both rows are already mine" without a trigger; this is simpler.
CREATE OR REPLACE FUNCTION public.link_test_series_registration_order(
  p_registration_id uuid,
  p_order_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.test_series_registrations
  SET order_id = p_order_id
  WHERE id = p_registration_id
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_test_series_registration_order(uuid, uuid) TO authenticated;
