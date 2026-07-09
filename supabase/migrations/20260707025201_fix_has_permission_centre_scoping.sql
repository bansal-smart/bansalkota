-- Phase 2 groundwork, part 1: fix a real gap in the Phase 1 permission system,
-- then extend it for the modules Phase 2 needs.
--
-- BUG: has_permission(_user_id, _module, _action) never checked which centre a
-- row belongs to — it only answered "does this user hold this permission at
-- all". Every Phase-1 policy built on it (centres, enquiries, centre_banners,
-- centre_carousel_banners, centre_gallery, centre_online_courses/chapters/
-- lessons, centre_courses, live_classes) therefore let a centre-scope user
-- (full centre-admin OR a custom-role holder) act on ANY centre's rows, not
-- just their own. Fixed by adding an optional _centre_id argument: when
-- provided, has_permission additionally requires the caller to be
-- centre_staff AT THAT SPECIFIC CENTRE. Admin-portal call sites (which never
-- pass _centre_id) are unaffected — default NULL preserves old behaviour.
--
-- Also fixes the module-key mismatch between the Phase-1 RLS (website_
-- enquiries/support) and the actual centre module catalog + seeded role
-- presets (enquiries/centre_support), and adds/upgrades policies for the
-- three new Phase-2 modules: courses, test_platform (tests + test_series),
-- and news_updates (centre_updates, previously membership-only).

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _module text,
  _action text,
  _centre_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _role_id uuid;
  _grant boolean;
BEGIN
  IF public.has_role(_user_id, 'super_admin'::public.app_role) THEN
    RETURN true;
  END IF;

  IF _centre_id IS NOT NULL THEN
    -- Centre-scoped check: caller must be staff AT THIS SPECIFIC centre.
    -- (Admin/super_admin bypass for centre tables is handled by the separate
    -- is_admin_or_super() OR-branch already present in every centre policy.)
    IF NOT EXISTS (
      SELECT 1 FROM public.centre_staff cs
      WHERE cs.user_id = _user_id AND cs.centre_id = _centre_id
    ) THEN
      RETURN false;
    END IF;

    SELECT ra.role_id INTO _role_id
    FROM public.role_assignments ra
    WHERE ra.user_id = _user_id
    LIMIT 1;

    IF _role_id IS NULL THEN
      RETURN true; -- staff at this centre with no custom role = full centre-admin access
    END IF;
  ELSE
    -- Admin-portal check (no centre concept).
    _is_admin := public.has_role(_user_id, 'admin'::public.app_role);

    SELECT ra.role_id INTO _role_id
    FROM public.role_assignments ra
    WHERE ra.user_id = _user_id
    LIMIT 1;

    IF _is_admin AND _role_id IS NULL THEN
      RETURN true;
    END IF;
    IF _role_id IS NULL THEN
      RETURN false;
    END IF;
  END IF;

  SELECT CASE _action
    WHEN 'view' THEN can_view
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    WHEN 'export' THEN can_export
    ELSE false
  END INTO _grant
  FROM public.role_permissions
  WHERE role_id = _role_id AND module = _module;

  RETURN COALESCE(_grant, false);
END;
$$;

-- ---------------------------------------------------------------------------
-- centres (centre_detail) — pass the row's own id as the centre to check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff edit their centre" ON public.centres;
CREATE POLICY "Centre staff edit their centre"
ON public.centres FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'centre_detail', 'edit', id))
WITH CHECK (public.has_permission(auth.uid(), 'centre_detail', 'edit', id));

-- ---------------------------------------------------------------------------
-- enquiries — rename module keys to match the catalog (enquiries /
-- centre_support, not website_enquiries / support) and scope by centre.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff view website enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Centre staff update website enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Centre staff view support enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Centre staff update support enquiries" ON public.enquiries;

CREATE POLICY "Centre staff view website enquiries"
ON public.enquiries FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'enquiries', 'view', centre_id)
);

CREATE POLICY "Centre staff update website enquiries"
ON public.enquiries FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'enquiries', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND source_type = 'website'
  AND public.has_permission(auth.uid(), 'enquiries', 'edit', centre_id)
);

CREATE POLICY "Centre staff view support enquiries"
ON public.enquiries FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'centre_support', 'view', centre_id)
);

CREATE POLICY "Centre staff update support enquiries"
ON public.enquiries FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'centre_support', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND source_type = 'center_support'
  AND public.has_permission(auth.uid(), 'centre_support', 'edit', centre_id)
);

-- centre_course_enquiries: dead table (centre_courses is being retired in
-- favour of the unified courses table — no Phase-2 UI reads this), but fix
-- the centre-scoping anyway since it's still reachable via direct API.
DROP POLICY IF EXISTS "Centre staff view course enquiries" ON public.centre_course_enquiries;
DROP POLICY IF EXISTS "Centre staff update course enquiries" ON public.centre_course_enquiries;

CREATE POLICY "Centre staff view course enquiries"
ON public.centre_course_enquiries FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'view', centre_id)
);

CREATE POLICY "Centre staff update course enquiries"
ON public.centre_course_enquiries FOR UPDATE TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'course_enquiries', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- profiles (students) — scope by centre.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff view their students" ON public.profiles;
DROP POLICY IF EXISTS "Centre staff update their students" ON public.profiles;

CREATE POLICY "Centre staff view their students"
ON public.profiles FOR SELECT TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'view', centre_id)
);

CREATE POLICY "Centre staff update their students"
ON public.profiles FOR UPDATE TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'students', 'edit', centre_id)
  AND NOT (centre_id IS DISTINCT FROM (SELECT f.centre_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (school_id IS DISTINCT FROM (SELECT f.school_id FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (roll_number IS DISTINCT FROM (SELECT f.roll_number FROM public.get_profile_lock_fields(profiles.user_id) f))
  AND NOT (is_bansal_offline_student IS DISTINCT FROM (SELECT f.is_bansal_offline_student FROM public.get_profile_lock_fields(profiles.user_id) f))
);

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

  IF NOT public.has_permission(auth.uid(), 'students', 'edit', _centre_id) THEN
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
-- centre_banners / centre_carousel_banners / centre_gallery — scope by centre.
-- (page_banners / centre_banner are not Phase-2 tabs, but the RLS gap is
-- fixed regardless since the tables and columns still exist and are reachable.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff manage banners" ON public.centre_banners;
CREATE POLICY "Centre staff manage banners"
ON public.centre_banners FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'page_banners', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'page_banners', 'edit', centre_id)
);

DROP POLICY IF EXISTS "Centre staff and admins manage carousel banners" ON public.centre_carousel_banners;
CREATE POLICY "Centre staff and admins manage carousel banners"
ON public.centre_carousel_banners FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_permission(auth.uid(), 'centre_banner', 'edit', centre_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_permission(auth.uid(), 'centre_banner', 'edit', centre_id)
);

DROP POLICY IF EXISTS "Centre staff & admins manage gallery" ON public.centre_gallery;
CREATE POLICY "Centre staff & admins manage gallery"
ON public.centre_gallery FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'gallery', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'gallery', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- centre_online_courses / chapters / lessons — deprecated tables (folded into
-- the unified courses table for Phase 2), fixed anyway since still reachable.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff manage own centre online courses" ON public.centre_online_courses;
CREATE POLICY "Centre staff manage own centre online courses"
ON public.centre_online_courses FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'online_courses', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'online_courses', 'edit', centre_id)
);

DROP POLICY IF EXISTS "Centre staff manage own centre chapters" ON public.centre_online_chapters;
CREATE POLICY "Centre staff manage own centre chapters"
ON public.centre_online_chapters FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_chapters.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit', c.centre_id)
  )
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_chapters.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit', c.centre_id)
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
      AND public.has_permission(auth.uid(), 'online_courses', 'edit', c.centre_id)
  )
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.centre_online_courses c
    WHERE c.id = centre_online_lessons.centre_course_id
      AND public.has_permission(auth.uid(), 'online_courses', 'edit', c.centre_id)
  )
);

DROP POLICY IF EXISTS "Centre staff manage their courses" ON public.centre_courses;
CREATE POLICY "Centre staff manage their courses"
ON public.centre_courses FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_courses', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'centre_courses', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- live_classes — centre-admin ALL policy, scoped by centre.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre admins manage centre live classes" ON public.live_classes;
CREATE POLICY "Centre admins manage centre live classes"
ON public.live_classes FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'live_classes', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'live_classes', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- centre_updates (news_updates module) — was membership-only; upgrade to the
-- same permission-checked + centre-scoped pattern as centre_gallery.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centre staff & admins manage updates" ON public.centre_updates;
CREATE POLICY "Centre staff & admins manage updates"
ON public.centre_updates FOR ALL TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'news_updates', 'edit', centre_id)
)
WITH CHECK (
  public.is_admin_or_super(auth.uid())
  OR public.has_permission(auth.uid(), 'news_updates', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- courses (courses module, centre side) — NEW. Franchise centres may create
-- their own offline courses; is_global and centre_id are locked server-side
-- (a restricted role cannot flip a course global or attribute it elsewhere).
-- Admin/super_admin write access is unaffected (separate pre-existing policy).
-- ---------------------------------------------------------------------------
CREATE POLICY "Centre staff manage their own courses"
ON public.courses FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'courses', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND is_global = false
  AND public.has_permission(auth.uid(), 'courses', 'edit', centre_id)
);

-- ---------------------------------------------------------------------------
-- tests / test_series (test_platform module, centre side) — NEW. Same
-- centre-local, is_global=false-locked pattern as courses.
-- ---------------------------------------------------------------------------
CREATE POLICY "Centre staff manage their own tests"
ON public.tests FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND is_global = false
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
);

CREATE POLICY "Centre staff manage their own test series"
ON public.test_series FOR ALL TO authenticated
USING (
  centre_id IS NOT NULL
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND is_global = false
  AND public.has_permission(auth.uid(), 'test_platform', 'edit', centre_id)
);

-- test_questions: franchise centres can only add/edit questions on tests they
-- themselves own (their own centre's test row) — never on HQ/global tests.
CREATE POLICY "Centre staff manage questions of their own tests"
ON public.test_questions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_platform', 'edit', t.centre_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND t.centre_id IS NOT NULL
      AND t.is_global = false
      AND public.has_permission(auth.uid(), 'test_platform', 'edit', t.centre_id)
  )
);
