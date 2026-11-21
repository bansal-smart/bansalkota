-- Fix: portal payments never reached "Payments & Revenue".
--
-- Root causes (see audit):
--  1. cashfree-webhook upserted with onConflict "gateway,external_id", but the only
--     matching unique index was PARTIAL (WHERE external_id IS NOT NULL). Postgres
--     cannot infer a partial index from a bare column list (42P10), so every upsert
--     failed and the error was ignored.
--  2. The webhook wrote status 'succeeded'/'cancelled' while the admin page only
--     understands 'success'/'failed'/'refunded'/'pending'.
--  3. Nothing wrote student_name / plan, the return-page verifier never wrote a
--     payment row, and BOOST registration payments were never recorded.

-- Link a payment row back to the Cashfree order_id (orders.id uuid, or "boost_<uuid>").
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_ref text;
CREATE INDEX IF NOT EXISTS idx_payments_order_ref ON public.payments(order_ref);

-- A plain unique index works with ON CONFLICT / duplicate detection. NULL external_ids
-- remain allowed multiple times (NULLs are distinct in a unique index).
DROP INDEX IF EXISTS public.uniq_payments_gateway_external_id;
CREATE UNIQUE INDEX uniq_payments_gateway_external_id
  ON public.payments(gateway, external_id);

-- Normalise any legacy status values to the vocabulary the admin UI uses.
UPDATE public.payments SET status = 'success' WHERE status = 'succeeded';
UPDATE public.payments SET status = 'failed'  WHERE status = 'cancelled';

-- Backfill: orders already marked paid that have no payment row.
INSERT INTO public.payments (user_id, student_name, plan, amount, currency, gateway, external_id, status, order_ref, metadata, created_at)
SELECT o.user_id,
       p.full_name,
       (SELECT string_agg(oi.item_title, ', ') FROM public.order_items oi WHERE oi.order_id = o.id),
       o.total,
       COALESCE(o.currency, 'INR'),
       'cashfree',
       NULL,
       'success',
       o.id::text,
       jsonb_build_object('backfilled', true),
       o.created_at
FROM public.orders o
LEFT JOIN public.profiles p ON p.user_id = o.user_id
WHERE o.status = 'paid'
  AND o.provider = 'cashfree'
  AND NOT EXISTS (SELECT 1 FROM public.payments x WHERE x.order_ref = o.id::text);

-- Backfill: paid BOOST registrations.
INSERT INTO public.payments (user_id, student_name, plan, amount, currency, gateway, external_id, status, order_ref, metadata, created_at)
SELECT NULL,
       b.full_name,
       'BOOST 2026 registration',
       b.amount,
       'INR',
       'cashfree',
       b.payment_ref,
       'success',
       'boost_' || b.id::text,
       jsonb_build_object('backfilled', true),
       COALESCE(b.paid_at, b.created_at)
FROM public.boost_registrations b
WHERE b.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.payments x WHERE x.order_ref = 'boost_' || b.id::text);
