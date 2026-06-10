
-- 1. Storage policies for question-images bucket (public read, staff write)
CREATE POLICY "Public read question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

CREATE POLICY "Staff upload question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Staff update question images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Staff delete question images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- 2. Add parity columns to question_bank
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'mcq-single',
  ADD COLUMN IF NOT EXISTS numerical_answer numeric,
  ADD COLUMN IF NOT EXISTS tolerance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_marking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS option_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solution_image_url text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS source_filename text;

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS source_filename text;

-- 3. question_import_batches table
CREATE TABLE IF NOT EXISTS public.question_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('test','bank')),
  target_id uuid,
  filename text NOT NULL,
  question_count integer NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_import_batches TO authenticated;
GRANT ALL ON public.question_import_batches TO service_role;

ALTER TABLE public.question_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view import batches"
ON public.question_import_batches FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Staff create import batches"
ON public.question_import_batches FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Staff update own import batches"
ON public.question_import_batches FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins delete import batches"
ON public.question_import_batches FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_uploader ON public.question_import_batches(uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_target ON public.question_import_batches(target_type, target_id);
