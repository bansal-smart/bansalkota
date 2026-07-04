-- question-images: private bucket, staff-managed, readable by any logged-in user
CREATE POLICY "Authenticated read question images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'question-images');

CREATE POLICY "Staff manage question images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'question-images'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'teacher'::app_role))
)
WITH CHECK (
  bucket_id = 'question-images'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'teacher'::app_role))
);

-- avatars: public bucket, own-folder self-service
CREATE POLICY "Users manage own avatar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- course-resources: private bucket, staff-managed, readable by any logged-in user
CREATE POLICY "Authenticated read course resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-resources');

CREATE POLICY "Staff manage course resources"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'course-resources'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'teacher'::app_role))
)
WITH CHECK (
  bucket_id = 'course-resources'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'teacher'::app_role))
);

-- educator-uploads: public bucket, written by teachers/admins (course content) and students (doubt images)
CREATE POLICY "Authenticated manage educator uploads"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'educator-uploads')
WITH CHECK (bucket_id = 'educator-uploads');

-- site-content: public bucket, admin + centre-admin CMS content
CREATE POLICY "Staff manage site content"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'site-content'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'center_admin'::app_role))
)
WITH CHECK (
  bucket_id = 'site-content'
  AND (public.is_admin_or_super(auth.uid()) OR public.has_role(auth.uid(), 'center_admin'::app_role))
);
