
-- Restore non-answer columns on test_questions
GRANT SELECT (tolerance, solution_image_url) ON public.test_questions TO anon, authenticated;

-- Restore live_classes URLs (warn-level finding; will be addressed via app-side join URL helper later)
GRANT SELECT (meeting_url, recording_url) ON public.live_classes TO anon, authenticated;
