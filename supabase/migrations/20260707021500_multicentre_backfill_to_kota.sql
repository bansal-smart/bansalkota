-- Multi-Centre / HQ restructure — Phase 1, step 2: backfill existing data to Kota HQ.
-- No rows deleted — everything pre-restructure becomes Kota-owned. Kota id is
-- resolved via is_hq (not hardcoded).

DO $$
DECLARE
  _kota uuid;
BEGIN
  SELECT id INTO _kota FROM public.centres WHERE is_hq = true LIMIT 1;
  IF _kota IS NULL THEN
    RAISE EXCEPTION 'No HQ centre (is_hq=true) found — cannot backfill';
  END IF;

  -- Students without a centre become Kota students.
  UPDATE public.profiles SET centre_id = _kota WHERE centre_id IS NULL;

  -- Courses: all existing courses are Kota's. Online courses stay global (and in
  -- the public store); offline/other courses become Kota-local.
  UPDATE public.courses
    SET centre_id = _kota,
        is_global = COALESCE(mode = 'Online', false)
    WHERE centre_id IS NULL;

  -- Tests / series: Kota-owned and Kota-local (is_global stays false). Safe because
  -- no franchise students see them yet; HQ can flag specific ones global later.
  UPDATE public.tests SET centre_id = _kota WHERE centre_id IS NULL;
  UPDATE public.test_series SET centre_id = _kota WHERE centre_id IS NULL;

  -- Existing batches are Kota's legacy course-linked batches (keep their course_id).
  UPDATE public.course_batches SET centre_id = _kota WHERE centre_id IS NULL;

  -- Kota HQ keeps manual roll numbers: leave city_code/centre_code NULL for HQ.
END $$;
