-- Remove the teacher/mentor roles and the doubt-solving feature entirely.
-- The teacher portal, mentor concept, and doubt-solving are being retired;
-- centre_admin plus super_admin-defined sub-roles are the only roles below
-- admin/super_admin going forward.
--
-- Note: 'teacher' and 'mentor' remain as unused values in the app_role enum.
-- Postgres cannot drop enum values in place, and several RLS policies still
-- carry literal '...'::app_role casts compiled against the existing type —
-- recreating the type would require dropping and rebuilding every dependent
-- policy/function across the schema. Leaving the unused values costs nothing
-- (no code assigns them anymore) and avoids that blast radius.

-- 1. Drop the doubt-solving feature (tables, trigger, function, and the
-- profiles policy that let teachers view their assigned doubt-askers).
DROP POLICY IF EXISTS "Teachers can view assigned doubt student profiles" ON public.profiles;
DROP TRIGGER IF EXISTS trg_pick_teacher_for_doubt ON public.doubts;
DROP FUNCTION IF EXISTS public.pick_teacher_for_doubt();
DROP TABLE IF EXISTS public.doubt_answers CASCADE;
DROP TABLE IF EXISTS public.doubts CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS doubt_preference;

-- 2. Drop teacher-ownership columns on tables that survive (course/live-class
-- authorship reverts to whichever admin/super_admin manages them going forward).
-- course_resources has a policy branch keyed off courses.assigned_teacher_id;
-- drop that branch first so the column drop isn't blocked by the dependency.
DROP POLICY IF EXISTS "Enrolled or staff can view published resource metadata" ON public.course_resources;
CREATE POLICY "Enrolled or staff can view published resource metadata"
ON public.course_resources FOR SELECT TO authenticated
USING (
  is_published = true
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'center_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_resources.course_id AND e.user_id = auth.uid() AND e.is_active = true
    )
  )
);

ALTER TABLE public.courses DROP COLUMN IF EXISTS assigned_teacher_id;
ALTER TABLE public.live_class_templates DROP COLUMN IF EXISTS teacher_id;

-- 3. Reassign any existing 'teacher'/'mentor' user_roles rows down to 'student'
-- so no account is left without a usable role once teacher/mentor UI is gone.
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, 'student'::app_role
FROM public.user_roles ur
WHERE ur.role IN ('teacher'::app_role, 'mentor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles WHERE role IN ('teacher'::app_role, 'mentor'::app_role);

-- 4. Strip the now-dead 'teacher' OR-branch from the test-engine RLS policies
-- (the only remaining policies that referenced the teacher role).
DROP POLICY IF EXISTS "Staff manage all tests" ON public.tests;
DROP POLICY IF EXISTS "View questions of accessible tests" ON public.test_questions;
DROP POLICY IF EXISTS "Staff manage all test questions" ON public.test_questions;

CREATE POLICY "Staff manage all tests"
ON public.tests
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "View questions of accessible tests"
ON public.test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_questions.test_id
      AND (
        t.is_published = true
        OR t.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);

CREATE POLICY "Staff manage all test questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 5. Drop the now-dead per-teacher live-classes policy (courses/live classes
-- are managed by admin/super_admin going forward; the "Staff can manage live
-- classes" and centre-admin policies already cover the remaining cases).
DROP POLICY IF EXISTS "Teachers manage own live classes" ON public.live_classes;
