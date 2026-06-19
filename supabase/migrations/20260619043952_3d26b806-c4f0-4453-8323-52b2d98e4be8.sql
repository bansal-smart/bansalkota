
-- =========================================================================
-- Phase 1 · Step 1: Rename "center*" → "centre*" (DB layer)
-- + add is_pinned + seed Kota
-- =========================================================================

-- 1. Rename tables
ALTER TABLE public.centers RENAME TO centres;
ALTER TABLE public.center_staff RENAME TO centre_staff;
ALTER TABLE public.center_courses RENAME TO centre_courses;
ALTER TABLE public.center_banners RENAME TO centre_banners;
ALTER TABLE public.center_gallery RENAME TO centre_gallery;
ALTER TABLE public.center_updates RENAME TO centre_updates;
ALTER TABLE public.center_course_enquiries RENAME TO centre_course_enquiries;

-- 2. Rename center_id columns to centre_id (RLS expressions update automatically)
ALTER TABLE public.centre_staff             RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.centre_courses           RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.centre_banners           RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.centre_gallery           RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.centre_updates           RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.centre_course_enquiries  RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.profiles                 RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.course_batches           RENAME COLUMN center_id TO centre_id;
ALTER TABLE public.enquiries                RENAME COLUMN center_id TO centre_id;

-- 3. is_pinned for centres + seed Kota
ALTER TABLE public.centres
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
UPDATE public.centres
   SET is_pinned = true
 WHERE lower(city) LIKE '%kota%' OR lower(slug) LIKE '%kota%' OR is_hq = true;

-- 4. New canonical helper functions
CREATE OR REPLACE FUNCTION public.is_centre_staff(_user_id uuid, _centre_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_staff
    WHERE user_id = _user_id AND centre_id = _centre_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_any_centre_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.centre_staff WHERE user_id = _user_id)
$$;

-- 5. Backwards-compat wrappers (existing RLS policies + edge functions keep working)
CREATE OR REPLACE FUNCTION public.is_center_staff(_user_id uuid, _center_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_centre_staff(_user_id, _center_id) $$;

CREATE OR REPLACE FUNCTION public.is_any_center_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_any_centre_staff(_user_id) $$;

-- 6. Fix functions that reference the now-renamed tables/columns
CREATE OR REPLACE FUNCTION public.revoke_center_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.centre_staff WHERE user_id = OLD.user_id) THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'center_admin'::app_role;
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id uuid := NULL;
  v_is_offline boolean := false;
BEGIN
  BEGIN
    v_centre_id := NULLIF(
      COALESCE(NEW.raw_user_meta_data ->> 'centre_id', NEW.raw_user_meta_data ->> 'center_id'),
      ''
    )::uuid;
  EXCEPTION WHEN OTHERS THEN v_centre_id := NULL; END;
  v_is_offline := COALESCE((NEW.raw_user_meta_data ->> 'is_bansal_offline_student')::boolean, false);

  INSERT INTO public.profiles (
    user_id, full_name, phone, avatar_url,
    target_exam, class_level, city, country,
    centre_id, is_bansal_offline_student
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
    v_centre_id,
    v_is_offline
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

-- 7. Index for fast ordered listing
CREATE INDEX IF NOT EXISTS centres_pinned_city_idx
  ON public.centres (is_pinned DESC, city ASC);
