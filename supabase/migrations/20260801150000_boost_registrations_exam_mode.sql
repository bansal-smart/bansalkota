-- The BOOST registration form now collects an explicit "Exam Mode"
-- (Online / Offline) alongside the preferred centre, instead of inferring
-- mode from an empty centre selection.
ALTER TABLE public.boost_registrations
  ADD COLUMN exam_mode TEXT CHECK (exam_mode IN ('Online', 'Offline'));
