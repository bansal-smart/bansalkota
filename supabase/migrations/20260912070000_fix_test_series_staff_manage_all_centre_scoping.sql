-- "Staff manage all test series" (20260704190000_centre_scoped_tests_and_series.sql)
-- restricted admin/super_admin ALL access to `centre_id IS NULL` rows, splitting
-- global (HQ) test series from centre-owned ones. Three days later,
-- 20260707021500_multicentre_backfill_to_kota.sql retroactively stamped every
-- existing test_series row with Kota's centre_id, so `centre_id IS NULL` now
-- matches zero rows — the policy became permanently unreachable for real data.
--
-- AdminTestSeriesPage.tsx's own list query was already patched for this exact
-- backfill collision (see its "hardcoded centre_id IS NULL... permanently
-- invisible" comment), but this UPDATE/DELETE policy never was. The result:
-- any admin who is not super_admin and not registered as Kota centre_staff
-- has their UPDATE on any test series match zero RLS-visible rows — Postgres
-- raises no error for that, so the app's "if (error) toast.error(...)" check
-- never fires, a success toast shows, and nothing actually persists (verified
-- directly: impersonating a real plain-admin account and running the exact
-- update the edit page performs changed 0 rows with no error).
--
-- Fix: staff/super_admin manage every test series regardless of centre_id,
-- matching how the admin test-series list page already treats them ("staff/
-- super_admin see every centre for full oversight"). Centre-scoped policies
-- below are untouched and keep scoping franchise centre admins to their own
-- centre — RLS permissive policies OR together, so this is strictly additive.

DROP POLICY IF EXISTS "Staff manage all test series" ON public.test_series;

CREATE POLICY "Staff manage all test series"
ON public.test_series
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);
