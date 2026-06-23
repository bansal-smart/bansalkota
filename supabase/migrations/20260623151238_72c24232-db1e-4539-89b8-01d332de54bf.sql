
-- Add centre scoping to live_classes
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS live_classes_centre_id_idx ON public.live_classes(centre_id);

-- Helper: is the current user staff of this centre?
CREATE OR REPLACE FUNCTION public.is_centre_staff(_user_id uuid, _centre_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_staff
    WHERE user_id = _user_id AND centre_id = _centre_id
  );
$$;

-- Allow centre admins to fully manage live classes scoped to their centre
DROP POLICY IF EXISTS "Centre admins manage centre live classes" ON public.live_classes;
CREATE POLICY "Centre admins manage centre live classes"
ON public.live_classes
FOR ALL
TO authenticated
USING (
  centre_id IS NOT NULL
  AND has_role(auth.uid(), 'center_admin'::app_role)
  AND public.is_centre_staff(auth.uid(), centre_id)
)
WITH CHECK (
  centre_id IS NOT NULL
  AND has_role(auth.uid(), 'center_admin'::app_role)
  AND public.is_centre_staff(auth.uid(), centre_id)
);

-- Allow students mapped to a centre to view that centre's live classes
DROP POLICY IF EXISTS "Centre students view centre live classes" ON public.live_classes;
CREATE POLICY "Centre students view centre live classes"
ON public.live_classes
FOR SELECT
TO authenticated
USING (
  centre_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.centre_id = live_classes.centre_id
  )
);
