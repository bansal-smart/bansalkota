
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cf_order_id text,
  ADD COLUMN IF NOT EXISTS cf_payment_session_id text,
  ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_orders_cf_order_id ON public.orders(cf_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_gateway_external_id
  ON public.payments(gateway, external_id) WHERE external_id IS NOT NULL;

-- Allow service_role (used by edge functions with service key) to manage these
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.enrollments TO service_role;
