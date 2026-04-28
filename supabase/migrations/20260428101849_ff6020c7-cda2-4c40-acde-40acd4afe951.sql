ALTER TABLE public.educator_applications
  ALTER COLUMN class_level TYPE text[]
  USING CASE
    WHEN class_level IS NULL OR class_level = '' THEN NULL
    ELSE ARRAY[class_level]
  END;