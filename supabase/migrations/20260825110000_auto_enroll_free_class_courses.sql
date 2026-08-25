-- Enroll every newly-created student into the published, free courses that
-- explicitly match their selected class. Keeping this in the auth trigger
-- makes enrollment reliable for email, Google, and future signup clients.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id uuid := NULL;
  v_is_offline boolean := false;
  v_class_level text := NULLIF(trim(NEW.raw_user_meta_data ->> 'class_level'), '');
BEGIN
  BEGIN
    v_centre_id := NULLIF(
      COALESCE(NEW.raw_user_meta_data ->> 'centre_id', NEW.raw_user_meta_data ->> 'center_id'),
      ''
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_centre_id := NULL;
  END;
  v_is_offline := COALESCE((NEW.raw_user_meta_data ->> 'is_bansal_offline_student')::boolean, false);

  INSERT INTO public.profiles (
    user_id, full_name, phone, phone_e164, phone_verified, avatar_url,
    target_exam, class_level, city, country, centre_id, is_bansal_offline_student
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    CASE WHEN NEW.raw_user_meta_data ->> 'phone' ~ '^\\+91[6-9][0-9]{9}$' THEN NEW.raw_user_meta_data ->> 'phone' END,
    false,
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'target_exam', v_class_level,
    NEW.raw_user_meta_data ->> 'city', NEW.raw_user_meta_data ->> 'country',
    v_centre_id, v_is_offline
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_class_level IS NOT NULL THEN
    INSERT INTO public.enrollments (user_id, course_id, expires_at)
    SELECT NEW.id, c.id, c.end_date::timestamptz
    FROM public.courses c
    WHERE c.is_published = true
      AND c.price = 0
      AND lower(trim(c.education_level)) = lower(v_class_level)
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
