-- Centre roles created through Role Management after 20260707030256 were saved with
-- the pre-merge module keys, because src/lib/centerModules.ts still emitted them.
-- Nav/route gating and RLS only know the admin-portal keys, so those permissions
-- (e.g. Student Analysis) were stored but never matched. The catalog is fixed in
-- code; this repairs the rows it already wrote.
--
-- role_permissions has UNIQUE (role_id, module): where a role already holds the
-- correct key, OR the grants into it and drop the stale row instead of renaming.

WITH renames(old_key, new_key) AS (
  VALUES
    ('student_analysis', 'student_reports'),
    ('batches_cbt',      'batches'),
    ('gallery',          'centre_gallery')
),
stale AS (
  SELECT rp.id, rp.role_id, rn.new_key,
         rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_export
  FROM public.role_permissions rp
  JOIN public.roles r ON r.id = rp.role_id AND r.scope = 'centre'
  JOIN renames rn ON rn.old_key = rp.module
),
merged AS (
  UPDATE public.role_permissions t
  SET can_view   = t.can_view   OR s.can_view,
      can_create = t.can_create OR s.can_create,
      can_edit   = t.can_edit   OR s.can_edit,
      can_delete = t.can_delete OR s.can_delete,
      can_export = t.can_export OR s.can_export
  FROM stale s
  WHERE t.role_id = s.role_id AND t.module = s.new_key
  RETURNING s.id
)
DELETE FROM public.role_permissions rp
USING stale s
WHERE rp.id = s.id
  AND EXISTS (SELECT 1 FROM public.role_permissions t WHERE t.role_id = s.role_id AND t.module = s.new_key);

UPDATE public.role_permissions rp
SET module = CASE rp.module
  WHEN 'student_analysis' THEN 'student_reports'
  WHEN 'batches_cbt'      THEN 'batches'
  WHEN 'gallery'          THEN 'centre_gallery'
END
FROM public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre'
  AND rp.module IN ('student_analysis', 'batches_cbt', 'gallery');

-- 'overview' has no page or RLS in the merged centre portal (dropped in 20260707030256);
-- the role modal kept offering it, so rows crept back in.
DELETE FROM public.role_permissions rp
USING public.roles r
WHERE rp.role_id = r.id AND r.scope = 'centre' AND rp.module = 'overview';
