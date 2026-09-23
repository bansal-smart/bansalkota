DROP FUNCTION IF EXISTS public.admin_get_test_series_order_registrations();

CREATE OR REPLACE FUNCTION public.admin_get_test_series_order_registrations()
RETURNS TABLE (
  order_id         uuid,
  item_id          uuid,
  item_title       text,
  amount           numeric,
  created_at       timestamptz,
  order_status     text,
  user_id          uuid,
  full_name        text,
  email            text,
  phone            text,
  class_level      text,
  target_exam      text,
  city             text,
  state            text,
  parent_phone     text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    o.id                                   AS order_id,
    o.item_id,
    o.item_title,
    o.amount,
    o.created_at,
    o.status                               AS order_status,
    o.user_id,
    COALESCE(p.full_name, au.raw_user_meta_data->>'full_name') AS full_name,
    au.email,
    COALESCE(p.phone, au.raw_user_meta_data->>'phone')         AS phone,
    p.class_level,
    p.target_exam,
    p.city,
    p.state,
    p.parent_phone
  FROM public.orders o
  JOIN auth.users    au ON au.id = o.user_id
  LEFT JOIN public.profiles p ON p.user_id = o.user_id
  WHERE o.item_type = 'test_series'
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_test_series_order_registrations() TO authenticated;
