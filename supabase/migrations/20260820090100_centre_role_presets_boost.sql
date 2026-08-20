-- Extend the centre role presets (20260707021630_centre_role_presets.sql)
-- with the new 'boost' module now that BOOST Registrations is centre-scoped
-- (see 20260820090000_centre_staff_view_boost_registrations.sql). Granted to
-- the same roles that already handle leads (enquiries): Centre Admin, HR,
-- Frontdesk. Unrestricted centre admins (no role_assignments row) already
-- get full access via has_permission(), so this only matters for these
-- named custom roles.

WITH preset(role_name, module, v, c, e, d, x) AS (
  VALUES
    ('Centre Admin', 'boost', true, false, true, false, true),
    ('HR',           'boost', true, false, true, false, true),
    ('Frontdesk',    'boost', true, false, true, false, false)
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
