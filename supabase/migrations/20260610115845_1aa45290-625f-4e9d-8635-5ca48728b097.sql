
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'center_admin';

-- 2. Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bansal_offline_student boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_center_id ON public.profiles(center_id);

-- 3. Enquiries additions + widened source check
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_source_check;
ALTER TABLE public.enquiries
  ADD CONSTRAINT enquiries_source_check
  CHECK (source = ANY (ARRAY['contact','admission','mentorship','center_support','other']));
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_source_type_check;
ALTER TABLE public.enquiries
  ADD CONSTRAINT enquiries_source_type_check
  CHECK (source_type = ANY (ARRAY['website','admission','center_support']));
CREATE INDEX IF NOT EXISTS idx_enquiries_center_id ON public.enquiries(center_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_source_type ON public.enquiries(source_type);

-- 4. center_staff
CREATE TABLE IF NOT EXISTS public.center_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner','manager')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_staff TO authenticated;
GRANT ALL ON public.center_staff TO service_role;
ALTER TABLE public.center_staff ENABLE ROW LEVEL SECURITY;

-- helper function (must exist before policies that use it)
CREATE OR REPLACE FUNCTION public.is_center_staff(_user_id uuid, _center_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.center_staff
    WHERE user_id = _user_id AND center_id = _center_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_any_center_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.center_staff WHERE user_id = _user_id)
$$;

CREATE POLICY "Staff read own center_staff rows" ON public.center_staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins manage center_staff" ON public.center_staff
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_center_staff_updated BEFORE UPDATE ON public.center_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-grant center_admin role on insert
CREATE OR REPLACE FUNCTION public.grant_center_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'center_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_center_staff_grant_role AFTER INSERT ON public.center_staff
  FOR EACH ROW EXECUTE FUNCTION public.grant_center_admin_role();

-- Revoke role when last centre membership removed
CREATE OR REPLACE FUNCTION public.revoke_center_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.center_staff WHERE user_id = OLD.user_id) THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'center_admin'::app_role;
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_center_staff_revoke_role AFTER DELETE ON public.center_staff
  FOR EACH ROW EXECUTE FUNCTION public.revoke_center_admin_role();

-- 5. center_courses
CREATE TABLE IF NOT EXISTS public.center_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  banner_url text,
  start_date date,
  duration text,
  fees numeric(12,2),
  currency text NOT NULL DEFAULT 'INR',
  schedule text,
  target_exam text,
  class_level text,
  description text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  brochure_url text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.center_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_courses TO authenticated;
GRANT ALL ON public.center_courses TO service_role;
ALTER TABLE public.center_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published center_courses" ON public.center_courses
  FOR SELECT
  USING (is_published = true OR public.is_admin_or_super(auth.uid()) OR public.is_center_staff(auth.uid(), center_id));
CREATE POLICY "Centre staff manage their courses" ON public.center_courses
  FOR ALL TO authenticated
  USING (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_center_courses_center ON public.center_courses(center_id);
CREATE TRIGGER trg_center_courses_updated BEFORE UPDATE ON public.center_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. center_course_enquiries
CREATE TABLE IF NOT EXISTS public.center_course_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.center_courses(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  class_level text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','admitted','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.center_course_enquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_course_enquiries TO authenticated;
GRANT ALL ON public.center_course_enquiries TO service_role;
ALTER TABLE public.center_course_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit course enquiry" ON public.center_course_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Centre staff view course enquiries" ON public.center_course_enquiries
  FOR SELECT TO authenticated
  USING (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Centre staff update course enquiries" ON public.center_course_enquiries
  FOR UPDATE TO authenticated
  USING (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Super admin delete course enquiries" ON public.center_course_enquiries
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cce_center ON public.center_course_enquiries(center_id);
CREATE TRIGGER trg_cce_updated BEFORE UPDATE ON public.center_course_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. center_banners
CREATE TABLE IF NOT EXISTS public.center_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title text,
  subtitle text,
  image_url text NOT NULL,
  cta_label text,
  cta_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.center_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_banners TO authenticated;
GRANT ALL ON public.center_banners TO service_role;
ALTER TABLE public.center_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active banners" ON public.center_banners
  FOR SELECT
  USING (is_active = true OR public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Centre staff manage banners" ON public.center_banners
  FOR ALL TO authenticated
  USING (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_center_staff(auth.uid(), center_id) OR public.is_admin_or_super(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_center_banners_center ON public.center_banners(center_id);
CREATE TRIGGER trg_center_banners_updated BEFORE UPDATE ON public.center_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Allow centre staff to read enquiries scoped to their centre
CREATE POLICY "Centre staff view their enquiries" ON public.enquiries
  FOR SELECT TO authenticated
  USING (center_id IS NOT NULL AND public.is_center_staff(auth.uid(), center_id));
CREATE POLICY "Centre staff update their enquiries" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (center_id IS NOT NULL AND public.is_center_staff(auth.uid(), center_id))
  WITH CHECK (center_id IS NOT NULL AND public.is_center_staff(auth.uid(), center_id));

-- 9. Centre staff can view profiles of students mapped to their centre
CREATE POLICY "Centre staff view their students" ON public.profiles
  FOR SELECT TO authenticated
  USING (center_id IS NOT NULL AND public.is_center_staff(auth.uid(), center_id));

-- 10. Extend handle_new_user to capture center_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END $$;
