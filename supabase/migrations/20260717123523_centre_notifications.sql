-- Centre Notifications: one-way broadcast channel, super_admin -> all centre
-- admins. A single row is visible to every centre_staff member (no per-centre
-- targeting/recipient list), mirroring the "Centre Notifications" tab on the
-- super admin dashboard and the read-only "Notifications" tab on the centre
-- admin dashboard.
CREATE TABLE public.centre_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_centre_notifications_created ON public.centre_notifications(created_at DESC);

ALTER TABLE public.centre_notifications ENABLE ROW LEVEL SECURITY;

-- Super admin: full control (compose, edit, delete).
CREATE POLICY "Super admin manages centre notifications"
  ON public.centre_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Centre staff: read-only, one-way (no insert/update/delete policy for them).
CREATE POLICY "Centre staff can view centre notifications"
  ON public.centre_notifications FOR SELECT TO authenticated
  USING (public.is_any_centre_staff(auth.uid()));

CREATE TRIGGER tg_centre_notifications_updated_at
  BEFORE UPDATE ON public.centre_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.centre_notifications;
ALTER TABLE public.centre_notifications REPLICA IDENTITY FULL;
