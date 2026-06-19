-- Perf hardening: wrap auth.uid() in subquery on hot tables + add composite index
-- on test_attempts to back the highest-volume autosave path.

-- 1) Composite index for fast (user_id, test_id, status) lookups during attempts.
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_test_status
  ON public.test_attempts(user_id, test_id, status);

-- 2) test_attempts policies
DROP POLICY IF EXISTS "Users manage own test attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Staff view all test attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Super admins delete test attempts" ON public.test_attempts;

CREATE POLICY "Users manage own test attempts"
  ON public.test_attempts FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Staff view all test attempts"
  ON public.test_attempts FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role));

CREATE POLICY "Super admins delete test attempts"
  ON public.test_attempts FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'super_admin'::app_role));

-- 3) lesson_progress policies
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can insert their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can view their own lesson progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert their own lesson progress"
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own lesson progress"
  ON public.lesson_progress FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- 4) notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can manage all notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Staff can manage all notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role)
           OR public.has_role((select auth.uid()), 'super_admin'::app_role));

-- 5) enrollments policies
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Staff can view all enrollments" ON public.enrollments;

CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "Users can create their own enrollments"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own enrollments"
  ON public.enrollments FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Staff can view all enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role));

-- 6) doubts policies
DROP POLICY IF EXISTS "Students manage own doubts" ON public.doubts;
DROP POLICY IF EXISTS "Assigned teacher views own doubts" ON public.doubts;
DROP POLICY IF EXISTS "Assigned teacher updates own doubts" ON public.doubts;

CREATE POLICY "Students manage own doubts"
  ON public.doubts FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Assigned teacher views own doubts"
  ON public.doubts FOR SELECT TO authenticated
  USING ((public.has_role((select auth.uid()), 'teacher'::app_role) AND assigned_teacher_id = (select auth.uid()))
      OR public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role));
CREATE POLICY "Assigned teacher updates own doubts"
  ON public.doubts FOR UPDATE TO authenticated
  USING ((public.has_role((select auth.uid()), 'teacher'::app_role) AND assigned_teacher_id = (select auth.uid()))
      OR public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role))
  WITH CHECK ((public.has_role((select auth.uid()), 'teacher'::app_role) AND assigned_teacher_id = (select auth.uid()))
      OR public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role));

-- 7) live_class_attendance policies
DROP POLICY IF EXISTS "Users manage own attendance" ON public.live_class_attendance;
DROP POLICY IF EXISTS "Staff view all attendance" ON public.live_class_attendance;

CREATE POLICY "Users manage own attendance"
  ON public.live_class_attendance FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Staff view all attendance"
  ON public.live_class_attendance FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role)
      OR public.has_role((select auth.uid()), 'super_admin'::app_role));