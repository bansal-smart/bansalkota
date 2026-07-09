-- Multi-Centre / HQ restructure — Phase 1, step 5: seed preset centre roles.
-- Five scope='centre' roles with default permission grids that super admin can
-- retweak in the Add Role modal. Module keys match src/lib/centerModules.ts.
-- batches_cbt intentionally never grants create (franchise admins cannot create
-- batches — batches are auto-generated).

INSERT INTO public.roles (scope, name, description) VALUES
  ('centre', 'Centre Admin',    'Full access to the centre panel'),
  ('centre', 'HR',              'Enquiries, hiring and student analysis'),
  ('centre', 'Frontdesk',       'Front desk: students, enquiries and support'),
  ('centre', 'Academics',       'Tests, batches, courses and student analysis'),
  ('centre', 'Content Manager', 'Gallery, news & updates and course content')
ON CONFLICT (scope, name) DO NOTHING;

WITH preset(role_name, module, v, c, e, d, x) AS (
  VALUES
    -- Centre Admin: everything (batches_cbt has no create)
    ('Centre Admin', 'overview',         true, false, false, false, false),
    ('Centre Admin', 'students',         true, true,  true,  true,  true),
    ('Centre Admin', 'test_platform',    true, true,  true,  true,  true),
    ('Centre Admin', 'batches_cbt',      true, false, true,  false, false),
    ('Centre Admin', 'student_analysis', true, false, false, false, true),
    ('Centre Admin', 'courses',          true, true,  true,  true,  false),
    ('Centre Admin', 'enquiries',        true, false, true,  true,  true),
    ('Centre Admin', 'centre_support',   true, false, true,  false, false),
    ('Centre Admin', 'gallery',          true, true,  true,  true,  false),
    ('Centre Admin', 'news_updates',     true, true,  true,  true,  false),
    -- HR
    ('HR', 'overview',         true, false, false, false, false),
    ('HR', 'students',         true, false, false, false, false),
    ('HR', 'student_analysis', true, false, false, false, true),
    ('HR', 'enquiries',        true, false, true,  true,  true),
    -- Frontdesk
    ('Frontdesk', 'overview',       true, false, false, false, false),
    ('Frontdesk', 'students',       true, true,  true,  false, false),
    ('Frontdesk', 'enquiries',      true, false, true,  false, false),
    ('Frontdesk', 'centre_support', true, false, true,  false, false),
    -- Academics
    ('Academics', 'overview',         true, false, false, false, false),
    ('Academics', 'students',         true, false, false, false, false),
    ('Academics', 'test_platform',    true, true,  true,  true,  true),
    ('Academics', 'batches_cbt',      true, false, true,  false, false),
    ('Academics', 'student_analysis', true, false, false, false, true),
    ('Academics', 'courses',          true, true,  true,  true,  false),
    -- Content Manager
    ('Content Manager', 'overview',     true, false, false, false, false),
    ('Content Manager', 'gallery',      true, true,  true,  true,  false),
    ('Content Manager', 'news_updates', true, true,  true,  true,  false),
    ('Content Manager', 'courses',      true, false, true,  false, false)
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
