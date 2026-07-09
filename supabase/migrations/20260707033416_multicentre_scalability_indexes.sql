-- Scalability pass: index every centre-scoped table that Phase 2 made a live
-- query/RLS filter path (tests, test_series, centre_banners, centre_gallery,
-- centre_updates, course_batches). All idempotent — safe if any already exist.
-- (profiles.centre_id, enquiries.centre_id, courses.centre_id, live_classes.
-- centre_id, centre_carousel_banners.centre_id, centre_online_*.centre_id
-- were already indexed by earlier migrations.)

CREATE INDEX IF NOT EXISTS idx_tests_centre ON public.tests(centre_id);
CREATE INDEX IF NOT EXISTS idx_test_series_centre ON public.test_series(centre_id);
CREATE INDEX IF NOT EXISTS idx_centre_banners_centre ON public.centre_banners(centre_id);
CREATE INDEX IF NOT EXISTS idx_centre_gallery_centre ON public.centre_gallery(centre_id);
CREATE INDEX IF NOT EXISTS idx_centre_updates_centre ON public.centre_updates(centre_id);
CREATE INDEX IF NOT EXISTS idx_course_batches_centre ON public.course_batches(centre_id);

-- test_questions is filtered via its parent test's centre in RLS
-- (EXISTS ... WHERE t.id = test_questions.test_id) — index the FK so that
-- lookup stays fast as the question count grows.
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON public.test_questions(test_id);
