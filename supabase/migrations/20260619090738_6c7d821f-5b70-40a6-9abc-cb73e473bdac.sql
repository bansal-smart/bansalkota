
DROP POLICY IF EXISTS "Authenticated view live class metadata" ON public.live_classes;

CREATE POLICY "Enrolled, staff, or creator view live classes"
  ON public.live_classes
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR created_by = auth.uid()
    OR course_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = live_classes.course_id
        AND e.user_id = auth.uid()
        AND e.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.live_class_attendance a
      WHERE a.class_id = live_classes.id
        AND a.user_id = auth.uid()
    )
  );
