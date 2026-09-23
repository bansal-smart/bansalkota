-- Admin RPC: fetch test-series order-item purchases with full student details.
-- Joins order_items → orders → auth.users → profiles using SECURITY DEFINER
-- so the admin client can read auth.users.email without exposing that table.
-- Only admins / super_admins may call this function.

DROP FUNCTION IF EXISTS public.admin_get_test_series_order_registrations();

CREATE OR REPLACE FUNCTION public.admin_get_test_series_order_registrations()
RETURNS TABLE (
  order_item_id    uuid,
  order_id         uuid,
  item_id          uuid,
  item_title       text,
  unit_price       numeric,
  oi_created_at    timestamptz,
  order_status     text,
  order_total      numeric,
  order_created_at timestamptz,
  user_id          uuid,
  full_name        text,
  email            text,
  phone            text,
  class_level      text,
  target_exam      text,
  city             text,
  state            text,
  father_name      text,
  parent_phone     text,
  shipping_name    text,
  shipping_phone   text,
  shipping_city    text,
  shipping_state   text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be admin or super_admin
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    oi.id                                  AS order_item_id,
    o.id                                   AS order_id,
    oi.item_id,
    oi.item_title,
    oi.unit_price,
    oi.created_at                          AS oi_created_at,
    o.status                               AS order_status,
    o.total                                AS order_total,
    o.created_at                           AS order_created_at,
    o.user_id,
    COALESCE(p.full_name, o.shipping_name, au.raw_user_meta_data->>'full_name')::text AS full_name,
    au.email::text,
    COALESCE(p.phone, o.shipping_phone, au.raw_user_meta_data->>'phone')::text         AS phone,
    p.class_level,
    p.target_exam,
    COALESCE(p.city, o.shipping_city)::text      AS city,
    COALESCE(p.state, o.shipping_state)::text    AS state,
    p.father_name,
    p.parent_phone,
    o.shipping_name,
    o.shipping_phone,
    o.shipping_city,
    o.shipping_state
  FROM public.order_items oi
  JOIN public.orders o       ON o.id  = oi.order_id
  JOIN auth.users    au      ON au.id = o.user_id
  LEFT JOIN public.profiles p ON p.user_id = o.user_id
  WHERE oi.item_type = 'test_series'
  ORDER BY oi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_test_series_order_registrations() TO authenticated;
