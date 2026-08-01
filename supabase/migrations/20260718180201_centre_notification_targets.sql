-- Optional per-centre targeting for centre_notifications. A notification
-- with no rows here is a broadcast to ALL centres (existing behaviour,
-- preserved for every row created before this migration). A notification
-- with one or more rows here is only visible to staff at those centres.
CREATE TABLE public.centre_notification_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.centre_notifications(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  UNIQUE (notification_id, centre_id)
);

CREATE INDEX idx_centre_notification_targets_notification ON public.centre_notification_targets(notification_id);
CREATE INDEX idx_centre_notification_targets_centre ON public.centre_notification_targets(centre_id);

ALTER TABLE public.centre_notification_targets ENABLE ROW LEVEL SECURITY;

-- Super admin: full control (set/change targets when composing).
CREATE POLICY "Super admin manages centre notification targets"
  ON public.centre_notification_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Centre staff: can see which centres a notification targets (needed to
-- resolve visibility client-side / for display), scoped to notifications
-- they can already see via the centre_notifications policy below.
CREATE POLICY "Centre staff can view notification targets"
  ON public.centre_notification_targets FOR SELECT TO authenticated
  USING (public.is_any_centre_staff(auth.uid()));

-- Replace the old "every centre_staff member sees every notification"
-- SELECT policy with one that also honours per-centre targeting: visible if
-- the notification has no target rows (= all centres) OR the caller is
-- staff at one of its targeted centres.
DROP POLICY IF EXISTS "Centre staff can view centre notifications" ON public.centre_notifications;

CREATE POLICY "Centre staff can view centre notifications"
  ON public.centre_notifications FOR SELECT TO authenticated
  USING (
    public.is_any_centre_staff(auth.uid())
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.centre_notification_targets t
        WHERE t.notification_id = centre_notifications.id
      )
      OR EXISTS (
        SELECT 1 FROM public.centre_notification_targets t
        JOIN public.centre_staff cs ON cs.centre_id = t.centre_id
        WHERE t.notification_id = centre_notifications.id
          AND cs.user_id = auth.uid()
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.centre_notification_targets;
ALTER TABLE public.centre_notification_targets REPLICA IDENTITY FULL;
