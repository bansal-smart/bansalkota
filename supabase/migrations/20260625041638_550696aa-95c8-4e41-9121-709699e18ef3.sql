ALTER TABLE public.boost_registrations
  ADD COLUMN IF NOT EXISTS cf_order_id text,
  ADD COLUMN IF NOT EXISTS cf_payment_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;