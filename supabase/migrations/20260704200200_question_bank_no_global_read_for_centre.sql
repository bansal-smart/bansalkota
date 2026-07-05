-- Per updated requirement: Centre Admin's Question Bank must be fully
-- separate from Super Admin's — no shared/global questions visible at all.
-- Drop the read-only global-visibility policy added in
-- centre_scoped_question_bank; centre staff now only ever see/manage rows
-- with their own centre_id. Tests/Test Series keep their existing shared
-- (global read + assign) behavior — this change is scoped to question_bank only.

DROP POLICY IF EXISTS "Centre staff view global question bank" ON public.question_bank;
