-- Adds Class/Stream/Test Type tagging to the Question Bank so questions can
-- be filtered and managed at scale (Subject and Difficulty already existed).
-- Nullable + no backfill: 7,195 existing questions predate this feature and
-- have no way to be auto-classified, so they stay untagged ("Unclassified"
-- in the UI) until an admin tags them — filters treat NULL as its own
-- bucket rather than silently excluding these rows.
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS stream text,
  ADD COLUMN IF NOT EXISTS test_type text;
