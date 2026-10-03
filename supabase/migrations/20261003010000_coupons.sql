-- Coupon codes: super-admin-managed discounts applied server-side at checkout
-- (cashfree-create-order for course/test_series/cart, create-boost-registration
-- for BOOST). Usage limits only count 'confirmed' (paid) redemptions.
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount_amount numeric CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  valid_from timestamptz,
  valid_until timestamptz,
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  applicable_scope text[] NOT NULL DEFAULT ARRAY['course', 'test_series', 'cart', 'boost'],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_upper CHECK (code = upper(code)),
  CONSTRAINT coupons_percent_range CHECK (discount_type <> 'percent' OR discount_value <= 100)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins insert coupons"
  ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins update coupons"
  ON public.coupons FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins delete coupons"
  ON public.coupons FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  identifier text,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  boost_registration_id uuid REFERENCES public.boost_registrations(id) ON DELETE CASCADE,
  discount_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Super admins can see redemption counts in the admin UI; all writes happen
-- through the service role (edge functions), which bypasses RLS.
CREATE POLICY "Super admins read coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX coupon_redemptions_coupon_status_idx ON public.coupon_redemptions (coupon_id, status);
CREATE INDEX coupon_redemptions_order_idx ON public.coupon_redemptions (order_id);
CREATE INDEX coupon_redemptions_boost_idx ON public.coupon_redemptions (boost_registration_id);

ALTER TABLE public.orders
  ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.boost_registrations
  ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- Single source of truth for coupon validation + discount computation.
-- Only counts 'confirmed' (paid) redemptions against the limits so abandoned
-- checkouts don't burn a slot.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_scope text,
  p_subtotal numeric,
  p_user_id uuid DEFAULT NULL,
  p_identifier text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  v_total_used integer;
  v_user_used integer;
  v_discount numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE code = upper(btrim(coalesce(p_code, '')));
  IF NOT FOUND OR NOT c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid coupon code');
  END IF;
  IF NOT (p_scope = ANY (c.applicable_scope)) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is not valid for this purchase');
  END IF;
  IF c.valid_from IS NOT NULL AND now() < c.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is not active yet');
  END IF;
  IF c.valid_until IS NOT NULL AND now() > c.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired');
  END IF;

  IF c.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO v_total_used
      FROM public.coupon_redemptions WHERE coupon_id = c.id AND status = 'confirmed';
    IF v_total_used >= c.usage_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit');
    END IF;
  END IF;

  IF p_user_id IS NOT NULL OR p_identifier IS NOT NULL THEN
    SELECT count(*) INTO v_user_used
      FROM public.coupon_redemptions
      WHERE coupon_id = c.id AND status = 'confirmed'
        AND ((p_user_id IS NOT NULL AND user_id = p_user_id)
          OR (p_identifier IS NOT NULL AND lower(identifier) = lower(p_identifier)));
    IF v_user_used >= c.per_user_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'You have already used this coupon');
    END IF;
  END IF;

  IF c.discount_type = 'percent' THEN
    v_discount := round(p_subtotal * c.discount_value / 100, 2);
    IF c.max_discount_amount IS NOT NULL THEN
      v_discount := least(v_discount, c.max_discount_amount);
    END IF;
  ELSE
    v_discount := c.discount_value;
  END IF;
  v_discount := greatest(0, least(v_discount, p_subtotal));

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Coupon applied',
    'coupon_id', c.id,
    'code', c.code,
    'discount_amount', v_discount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, text, numeric, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text, numeric, uuid, text) TO service_role;

-- Client-side preview for the "Apply" button. Best-effort: the authoritative
-- check (with the real user/email) runs again in the edge function.
CREATE OR REPLACE FUNCTION public.preview_coupon(
  p_code text,
  p_scope text,
  p_subtotal numeric
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.validate_coupon(p_code, p_scope, p_subtotal, auth.uid(), NULL);
$$;

REVOKE ALL ON FUNCTION public.preview_coupon(text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_coupon(text, text, numeric) TO anon, authenticated;
