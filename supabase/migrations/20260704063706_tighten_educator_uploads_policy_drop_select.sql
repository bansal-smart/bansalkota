-- The "Authenticated manage educator uploads" ALL policy accidentally granted
-- broad SELECT (file listing) on a public bucket, which is unnecessary since
-- public bucket reads already work via the public URL endpoint without RLS.
DROP POLICY "Authenticated manage educator uploads" ON storage.objects;

CREATE POLICY "Authenticated insert educator uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'educator-uploads');

CREATE POLICY "Authenticated update educator uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'educator-uploads')
WITH CHECK (bucket_id = 'educator-uploads');

CREATE POLICY "Authenticated delete educator uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'educator-uploads');
