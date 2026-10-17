-- Editable copy for the BOOST cards shown on the landing page and course pages.
-- Defaults match the text that was previously hardcoded.
ALTER TABLE public.boost_settings
  ADD COLUMN IF NOT EXISTS card_badge text NOT NULL DEFAULT 'BOOST 2026',
  ADD COLUMN IF NOT EXISTS card_title text NOT NULL DEFAULT 'Bansal Open Opportunity Scholarship Test',
  ADD COLUMN IF NOT EXISTS card_scholarship text NOT NULL DEFAULT '90% Scholarship',
  ADD COLUMN IF NOT EXISTS card_class_range text NOT NULL DEFAULT 'Class V to XII',
  ADD COLUMN IF NOT EXISTS card_cta_label text NOT NULL DEFAULT 'Explore Now';

NOTIFY pgrst, 'reload schema';
