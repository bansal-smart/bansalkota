-- Drop legacy orders (was a placeholder with only pending rows)
DROP TABLE IF EXISTS public.orders CASCADE;

-- =========================
-- module_packs
-- =========================
CREATE TABLE public.module_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_url text,
  target_exam text,
  class_level text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2),
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.module_packs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_packs TO authenticated;
GRANT ALL ON public.module_packs TO service_role;

ALTER TABLE public.module_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published packs"
  ON public.module_packs FOR SELECT
  USING (is_published = true OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage packs"
  ON public.module_packs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_module_packs_updated
  BEFORE UPDATE ON public.module_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- module_pack_items
-- =========================
CREATE TABLE public.module_pack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.module_packs(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pack_id, book_id)
);

GRANT SELECT ON public.module_pack_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_pack_items TO authenticated;
GRANT ALL ON public.module_pack_items TO service_role;

ALTER TABLE public.module_pack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pack items"
  ON public.module_pack_items FOR SELECT USING (true);

CREATE POLICY "Admins manage pack items"
  ON public.module_pack_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE INDEX idx_module_pack_items_pack ON public.module_pack_items(pack_id);

-- =========================
-- orders
-- =========================
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | failed | shipped | delivered | cancelled
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  shipping_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_state text,
  shipping_pincode text,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Users create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- =========================
-- order_items
-- =========================
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'book' | 'pack'
  item_id uuid NOT NULL,
  item_title text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
    )
  );

CREATE POLICY "Users insert own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE INDEX idx_order_items_order ON public.order_items(order_id);