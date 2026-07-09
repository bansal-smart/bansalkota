-- Multi-Centre / HQ restructure — Phase 1, step 4: standard franchise batches.
-- Every franchise (non-HQ) centre gets one batch per stream×class:
--   JEE  × {XI, XII, Dropper} -> XI-J,  XII-J,  XIII-J
--   NEET × {XI, XII, Dropper} -> XI-N,  XII-N,  XIII-N
-- Decoupled from any course (course_id NULL). Kota HQ is exempt (keeps its legacy
-- course-linked batches). class_level strings match the bulk-import normaliser
-- (XI->Class 11, XII->Class 12, XIII->Dropper).

CREATE OR REPLACE FUNCTION public.create_standard_batches(_centre_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.course_batches (centre_id, stream, class_level, code, name, course_id, is_active)
  SELECT _centre_id, g.stream, g.class_level, g.code, g.name, NULL, true
  FROM (VALUES
    ('JEE',  'Class 11', 'XI-J',   'Class 11 JEE'),
    ('JEE',  'Class 12', 'XII-J',  'Class 12 JEE'),
    ('JEE',  'Dropper',  'XIII-J', 'Dropper JEE'),
    ('NEET', 'Class 11', 'XI-N',   'Class 11 NEET'),
    ('NEET', 'Class 12', 'XII-N',  'Class 12 NEET'),
    ('NEET', 'Dropper',  'XIII-N', 'Dropper NEET')
  ) AS g(stream, class_level, code, name)
  ON CONFLICT (centre_id, code) WHERE course_id IS NULL DO NOTHING;
END $$;

-- Auto-create on new franchise centre.
CREATE OR REPLACE FUNCTION public.trg_centre_create_batches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.is_hq THEN
    PERFORM public.create_standard_batches(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS centre_after_insert_batches ON public.centres;
CREATE TRIGGER centre_after_insert_batches
  AFTER INSERT ON public.centres
  FOR EACH ROW EXECUTE FUNCTION public.trg_centre_create_batches();

-- Backfill every existing franchise centre.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.centres WHERE NOT is_hq LOOP
    PERFORM public.create_standard_batches(c.id);
  END LOOP;
END $$;
