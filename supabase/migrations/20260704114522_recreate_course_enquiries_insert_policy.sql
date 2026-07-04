-- Re-create the course_enquiries INSERT policy from scratch. The prior policy
-- was already permissive (WITH CHECK true) per catalog inspection, but live
-- inserts were still rejected with 42501 for both anon and authenticated
-- callers. Dropping and recreating forces Postgres to discard any stale
-- cached plan/policy state tied to the old policy object.
DROP POLICY IF EXISTS "Anyone can submit a course enquiry" ON public.course_enquiries;

CREATE POLICY "Anyone can submit a course enquiry"
  ON public.course_enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.course_enquiries TO anon, authenticated;
