-- Centre-scope Test Series Registrations: add it to the Centre role catalog
-- (src/lib/centerModules.ts) and the centre portal nav (AdminLayout.tsx), but
-- those are UI-only — until now the table had no centre-staff RLS at all
-- (only "Admins manage test series registrations" / admin+super_admin), so a
-- centre role granted the new module still couldn't see a single row.
--
-- Unlike boost_registrations, this table has no centre column of its own
-- (students don't pick a centre when registering for a test series). Scope
-- instead via the test series' own centre_id, the same derive-from-parent
-- pattern already used for test_questions -> tests.centre_id in
-- 20260707025201_fix_has_permission_centre_scoping.sql: a franchise centre's
-- staff may see/work registrations for test series *that centre* created.
-- Registrations against HQ/global test series (centre_id IS NULL) stay
-- admin/super_admin-only, same as before.

CREATE POLICY "Centre staff view their centre test series registrations"
ON public.test_series_registrations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_series ts
    WHERE ts.id = test_series_registrations.test_series_id
      AND ts.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_series_registrations', 'view', ts.centre_id)
  )
);

CREATE POLICY "Centre staff update their centre test series registrations"
ON public.test_series_registrations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_series ts
    WHERE ts.id = test_series_registrations.test_series_id
      AND ts.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_series_registrations', 'edit', ts.centre_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_series ts
    WHERE ts.id = test_series_registrations.test_series_id
      AND ts.centre_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'test_series_registrations', 'edit', ts.centre_id)
  )
);

-- Seed the same named presets that already handle BOOST leads (Centre Admin,
-- HR, Frontdesk) — see 20260820090100_centre_role_presets_boost.sql. No
-- delete grant, matching the module's centre-scope action set (view/edit/
-- export only — see CENTER_MODULES in src/lib/centerModules.ts). Unrestricted
-- centre admins (no role_assignments row) already get full access via
-- has_permission(), so this only matters for these named custom roles.
WITH preset(role_name, module, v, c, e, d, x) AS (
  VALUES
    ('Centre Admin', 'test_series_registrations', true, false, true, false, true),
    ('HR',           'test_series_registrations', true, false, true, false, true),
    ('Frontdesk',    'test_series_registrations', true, false, true, false, false)
)
INSERT INTO public.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_export)
SELECT r.id, p.module, p.v, p.c, p.e, p.d, p.x
FROM preset p
JOIN public.roles r ON r.name = p.role_name AND r.scope = 'centre'
ON CONFLICT (role_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_export = EXCLUDED.can_export;
