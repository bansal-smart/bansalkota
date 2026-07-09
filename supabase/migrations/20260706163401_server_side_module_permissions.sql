-- Wire has_permission() into RLS for the centre and admin modules that had
-- only membership-level checks before (is_centre_staff / is_admin_or_super),
-- so a custom-role user restricted in the UI is now also restricted at the
-- database layer, not just by the client-side .can() check.
--
-- Two pre-existing gaps are also closed here:
--   1. centres (centre_detail module) had no centre-staff write policy at all.
--   2. website_enquiries and support (centre side) shared one policy on
--      `enquiries` with no split by source_type — granting one implicitly
--      granted the other. Split by source_type below.

-- ---------------------------------------------------------------------------
-- centres (centre_detail module) — add the missing centre-staff write policy.
-- ---------------------------------------------------------------------------
CREATE POLICY "Centre staff edit their centre"
ON public.centres FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'centre_detail', 'edit'))
WITH CHECK (public.has_permission(auth.uid(), 'centre_detail', 'edit'));

-- ---------------------------------------------------------------------------
-- enquiries — split centre staff access by source_type so website_enquiries
-- and support are independently permission-checked.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff view their enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Centre staff update their enquiries" ON public.enquiries;

CREATE POLICY "Centre staff view website enquiries"
ON public.enquiries FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'website_enquiries', 'view')
);

CREATE POLICY "Centre staff update website enquiries"
ON public.enquiries FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'website_enquiries', 'edit')
)
WITH CHECK (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'website_enquiries', 'edit')
);

CREATE POLICY "Centre staff view support enquiries"
ON public.enquiries FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'support', 'view')
);

CREATE POLICY "Centre staff update support enquiries"
ON public.enquiries FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'support', 'edit')
)
WITH CHECK (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'support', 'edit')
);

-- ---------------------------------------------------------------------------
-- centre_course_enquiries (course_enquiries module, centre side)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff view course enquiries" ON public.centre_course_enquiries;
DROP POLICY IF EXISTS "Centre staff update course enquiries" ON public.centre_course_enquiries;

CREATE POLICY "Centre staff view course enquiries"
ON public.centre_course_enquiries FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'view')
);

CREATE POLICY "Centre staff update course enquiries"
ON public.centre_course_enquiries FOR UPDATE TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'edit')
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'edit')
);

-- ---------------------------------------------------------------------------
-- profiles (students module, centre side) — students list + edit.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff view their students" ON public.profiles;
DROP POLICY IF EXISTS "Centre staff can update their students" ON public.profiles;

CREATE POLICY "Centre staff view their students"
ON public.profiles FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'view')
);

CREATE POLICY "Centre staff update their students"
ON public.profiles FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'edit')
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'edit')
  AND NOT (centre_id IS DISTINCT FROM (SELECT f.centre_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (school_id IS DISTINCT FROM (SELECT f.school_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (roll_number IS DISTINCT FROM (SELECT f.roll_number FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (is_bansal_offline_student IS DISTINCT FROM (SELECT f.is_bansal_offline_student FROM public.get_profile_lock_fields(profiles.user_id) f))
);

-- The centre_update_student_batch RPC bypasses the profile lock-field guard
-- above by design (it's how batch reassignment happens) — gate it by the same
-- students/edit permission so a restricted custom-role user can't reassign
-- batches through the RPC after being denied the direct column update.
CREATE OR REPLACE FUNCTION public.centre_update_student_batch(_user_id uuid, _batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _centre_id uuid;
  _batch_centre_id uuid;
BEGIN
  SELECT centre_id INTO _centre_id FROM public.profiles WHERE user_id = _user_id;
  IF _centre_id IS NULL THEN
    RAISE EXCEPTION 'Student is not mapped to a centre';
  END IF;

  IF NOT public.has_permission(auth.uid(), 'students', 'edit') THEN
    RAISE EXCEPTION 'Not authorized for this centre';
  END IF;

  IF _batch_id IS NOT NULL THEN
    SELECT centre_id INTO _batch_centre_id FROM public.course_batches WHERE id = _batch_id;
    IF _batch_centre_id IS DISTINCT FROM _centre_id THEN
      RAISE EXCEPTION 'Batch does not belong to this centre';
    END IF;
  END IF;

  UPDATE public.profiles SET batch_id = _batch_id WHERE user_id = _user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- centre_banners (page_banners module, centre side)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff manage banners" ON public.centre_banners;

CREATE POLICY "Centre staff manage banners"
ON public.centre_banners FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'page_banners', 'edit')
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'page_banners', 'edit')
);

-- ---------------------------------------------------------------------------
-- centre_carousel_banners (centre_banner module)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff and admins manage carousel banners" ON public.centre_carousel_banners;

CREATE POLICY "Centre staff and admins manage carousel banners"
ON public.centre_carousel_banners FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_permission(auth.uid(), 'centre_banner', 'edit')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_permission(auth.uid(), 'centre_banner', 'edit')
);

-- ---------------------------------------------------------------------------
-- centre_gallery (gallery module, centre side)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff & admins manage gallery" ON public.centre_gallery;

CREATE POLICY "Centre staff & admins manage gallery"
ON public.centre_gallery FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'gallery', 'edit')
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'gallery', 'edit')
);

-- ---------------------------------------------------------------------------
-- centre_online_courses / chapters / lessons (online_courses module)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff manage own centre online courses" ON public.centre_online_courses;

CREATE POLICY "Centre staff manage own centre online courses"
ON public.centre_online_courses FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'online_courses', 'edit')
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'online_courses', 'edit')
);

DROP POLICY IF EXISTS "Centre staff manage own centre chapters" ON public.centre_online_chapters;

CREATE POLICY "Centre staff manage own centre chapters"
ON public.centre_online_chapters FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_chapters.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit')
  )
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_chapters.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit')
  )
);

DROP POLICY IF EXISTS "Centre staff manage own centre lessons" ON public.centre_online_lessons;

CREATE POLICY "Centre staff manage own centre lessons"
ON public.centre_online_lessons FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_lessons.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit')
  )
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_lessons.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit')
  )
);

-- ---------------------------------------------------------------------------
-- centre_courses (centre_courses module)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff manage their courses" ON public.centre_courses;

CREATE POLICY "Centre staff manage their courses"
ON public.centre_courses FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_courses', 'edit')
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_courses', 'edit')
);

-- ---------------------------------------------------------------------------
-- live_classes — centre-admin ALL policy (only the centre-scoped one; the
-- admin/teacher/student policies on this shared table are untouched).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre admins manage centre live classes" ON public.live_classes;

CREATE POLICY "Centre admins manage centre live classes"
ON public.live_classes FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'live_classes', 'edit')
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'live_classes', 'edit')
);
