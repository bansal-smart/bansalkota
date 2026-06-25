
CREATE TABLE public.course_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  course_name text NOT NULL,
  course_price numeric,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  class_level text,
  city text,
  state text,
  preferred_centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  message text,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_order_id text,
  payment_id text,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.course_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.course_enquiries TO authenticated;
GRANT ALL ON public.course_enquiries TO service_role;

ALTER TABLE public.course_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a course enquiry"
  ON public.course_enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view course enquiries"
  ON public.course_enquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update course enquiries"
  ON public.course_enquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete course enquiries"
  ON public.course_enquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER course_enquiries_set_updated_at
BEFORE UPDATE ON public.course_enquiries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_course_enquiries_created_at ON public.course_enquiries(created_at DESC);
CREATE INDEX idx_course_enquiries_course_id ON public.course_enquiries(course_id);
CREATE INDEX idx_course_enquiries_payment_status ON public.course_enquiries(payment_status);
