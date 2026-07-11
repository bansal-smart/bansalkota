-- question-images RLS: drop dead teacher-role check (teacher role removed
-- 2026-07-06 per CONTEXT.md), add centre_staff check to match the permission
-- behavior the now-retired s3-presign-upload / s3-delete-objects edge
-- functions enforced (admin_or_super OR teacher OR centre_staff).
DROP POLICY IF EXISTS "Staff manage question images" ON storage.objects;

CREATE POLICY "Staff manage question images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'question-images'
  AND (public.is_admin_or_super(auth.uid()) OR public.is_any_centre_staff(auth.uid()))
)
WITH CHECK (
  bucket_id = 'question-images'
  AND (public.is_admin_or_super(auth.uid()) OR public.is_any_centre_staff(auth.uid()))
);
