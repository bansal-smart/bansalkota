CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_center_id uuid := NULL;
  v_is_offline boolean := false;
BEGIN
  BEGIN
    v_center_id := NULLIF(NEW.raw_user_meta_data ->> 'center_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN v_center_id := NULL; END;
  v_is_offline := COALESCE((NEW.raw_user_meta_data ->> 'is_bansal_offline_student')::boolean, false);

  INSERT INTO public.profiles (
    user_id, full_name, phone, avatar_url,
    target_exam, class_level, city, country,
    center_id, is_bansal_offline_student
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'target_exam',
    NEW.raw_user_meta_data ->> 'class_level',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'country',
    v_center_id,
    v_is_offline
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-grant student role on signup if no role exists yet
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $function$;