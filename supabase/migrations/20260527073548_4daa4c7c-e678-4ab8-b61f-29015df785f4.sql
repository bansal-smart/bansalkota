
-- BOOKS
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  author text,
  subject text,
  target_exam text,
  class_level text,
  description text,
  cover_url text,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  discount_percent integer DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  tags text[] DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published books viewable by everyone" ON public.books FOR SELECT USING (is_published = true);
CREATE POLICY "Staff manage all books" ON public.books FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEST SERIES
CREATE TABLE public.test_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  target_exam text,
  subject text,
  description text,
  thumbnail_url text,
  total_tests integer NOT NULL DEFAULT 0,
  duration_months integer,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  discount_percent integer DEFAULT 0,
  features text[] DEFAULT '{}'::text[],
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.test_series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_series TO authenticated;
GRANT ALL ON public.test_series TO service_role;
ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published test series viewable by everyone" ON public.test_series FOR SELECT USING (is_published = true);
CREATE POLICY "Staff manage all test series" ON public.test_series FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER update_test_series_updated_at BEFORE UPDATE ON public.test_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('course','book','test_series')),
  item_id uuid NOT NULL,
  item_title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  payment_provider text,
  payment_reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Staff delete orders" ON public.orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
