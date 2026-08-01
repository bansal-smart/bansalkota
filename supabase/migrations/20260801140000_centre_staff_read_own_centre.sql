-- Fix: centre admins of UNPUBLISHED centres could not read their own centre row.
-- The existing "Public read published centers" policy only exposes published
-- centres (or admin/super_admin), so useCenterAdmin()'s joined centre came back
-- null for staff of unpublished centres. That left the "Add Student" form with
-- no resolvable centre, failing with "Roll No, Student Name and Centre are
-- required". Allow any centre staff to read their own centre regardless of
-- publish status. is_centre_staff() is SECURITY DEFINER, so no RLS recursion.
CREATE POLICY "Centre staff read own centre" ON public.centres
  FOR SELECT
  USING (public.is_centre_staff(auth.uid(), id));
