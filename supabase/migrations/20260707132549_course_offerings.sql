-- Lets a franchise centre "adopt" an existing global/HQ course and run it at
-- their own price, while the base courses row stays the single canonical
-- content record (curriculum authored once). courses.centre_id continues to
-- mean "who owns/authors this content"; course_offerings means "who else
-- runs it, at what price."
CREATE TABLE public.course_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  original_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, centre_id)
);

CREATE INDEX idx_course_offerings_course ON public.course_offerings(course_id);
CREATE INDEX idx_course_offerings_centre ON public.course_offerings(centre_id);

ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_course_offerings_updated_at
  BEFORE UPDATE ON public.course_offerings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public read (price display on /courses, /courses/:slug) — parent course's
-- own is_published gate is enforced at the query layer by callers, same
-- pattern as courses' own "viewable by everyone" policy.
CREATE POLICY "Course offerings are viewable by everyone"
ON public.course_offerings FOR SELECT TO authenticated, anon
USING (is_active = true);

-- Admin/super_admin manage any offering.
CREATE POLICY "Staff can manage all course offerings"
ON public.course_offerings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'super_admin'::public.app_role));

-- Centre staff manage only their own centre's offering — reuses the existing
-- 'courses' permission module (no new module key needed).
CREATE POLICY "Centre staff manage their own course offerings"
ON public.course_offerings FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'courses', 'edit', centre_id))
WITH CHECK (public.has_permission(auth.uid(), 'courses', 'edit', centre_id));

-- Additive, nullable columns so which centre/offering an enrollment or order
-- came through can be attributed for reporting and roll-number purposes.
-- NULL = pre-offerings enrollment or a non-course order; no backfill needed.
ALTER TABLE public.enrollments
  ADD COLUMN centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  ADD COLUMN offering_id uuid REFERENCES public.course_offerings(id) ON DELETE SET NULL;
CREATE INDEX idx_enrollments_centre ON public.enrollments(centre_id);

ALTER TABLE public.orders
  ADD COLUMN resolved_centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  ADD COLUMN resolved_offering_id uuid REFERENCES public.course_offerings(id) ON DELETE SET NULL;
