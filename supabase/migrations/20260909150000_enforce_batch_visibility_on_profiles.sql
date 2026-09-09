-- filterBatchesForCentre() (src/lib/batchVisibility.ts) keeps disabled and
-- out-of-scope centre_specific batches out of every "select batch" dropdown,
-- but that's a read-side/UI filter only. Nothing stopped profiles.batch_id
-- from being set to a disabled batch, or to a centre_specific batch this
-- student's centre was never granted, at the data layer:
--   - "Centre staff update their students" RLS locks centre_id/school_id/
--     roll_number/is_bansal_offline_student on UPDATE but never validates
--     batch_id.
--   - bulk-import (and any other edge function) writes profiles.batch_id
--     via the service-role client, which bypasses RLS entirely — an RLS fix
--     alone would not have covered it.
-- A BEFORE trigger is the one place that runs for every write path
-- regardless of caller privilege (direct client, RLS-governed or not, or a
-- service-role edge function), so it's the correct place for this invariant.

CREATE OR REPLACE FUNCTION public.enforce_batch_visibility_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visibility public.batch_visibility;
  v_allowed boolean;
BEGIN
  IF NEW.batch_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Column-level trigger already limits firing to writes that touch
  -- batch_id, but guard the no-op case too (e.g. an UPDATE that re-sends
  -- the same batch_id) so a batch disabled after the fact doesn't break
  -- unrelated edits to students already enrolled in it.
  IF TG_OP = 'UPDATE' AND NEW.batch_id IS NOT DISTINCT FROM OLD.batch_id THEN
    RETURN NEW;
  END IF;

  SELECT visibility INTO v_visibility FROM public.course_batches WHERE id = NEW.batch_id;
  IF v_visibility IS NULL THEN
    RAISE EXCEPTION 'Batch % does not exist', NEW.batch_id;
  END IF;

  IF v_visibility = 'disabled' THEN
    RAISE EXCEPTION 'This batch is disabled and cannot accept new students';
  END IF;

  IF v_visibility = 'centre_specific' THEN
    v_allowed := NEW.centre_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.batch_centre_visibility
      WHERE batch_id = NEW.batch_id AND centre_id = NEW.centre_id
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'This batch is not available to this student''s centre';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_batch_visibility ON public.profiles;
CREATE TRIGGER trg_enforce_batch_visibility
  BEFORE INSERT OR UPDATE OF batch_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_batch_visibility_on_profile();

-- Second gap found while tracing this: course_batches.visibility has a
-- blanket `DEFAULT 'global'`, which was correct for the backfill (centre_id
-- IS NULL rows) but is wrong for any *new* row that sets a real centre_id
-- without also passing visibility — e.g. cbt-bulk-setup auto-creates a batch
-- scoped to the calling centre via centre_id but has no idea the visibility
-- column exists. Under the blanket default that batch silently becomes
-- 'global' and leaks into every other centre's "Select batch" dropdown —
-- the exact symptom this ticket reports, just from a different code path
-- than the ones already wired to filterBatchesForCentre().
--
-- Fix: drop the blanket default and compute it from centre_id instead
-- (mirrors the original pre-visibility-model behavior: a real centre_id
-- meant "only that centre", NULL meant "everyone"). A caller that already
-- knows about visibility (AdminBatchesPage.tsx) still gets exactly what it
-- asks for, since this only fires when the column is left unspecified.
ALTER TABLE public.course_batches ALTER COLUMN visibility DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.default_batch_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visibility IS NULL THEN
    NEW.visibility := CASE WHEN NEW.centre_id IS NULL THEN 'global' ELSE 'centre_specific' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_batch_visibility ON public.course_batches;
CREATE TRIGGER trg_default_batch_visibility
  BEFORE INSERT ON public.course_batches
  FOR EACH ROW EXECUTE FUNCTION public.default_batch_visibility();

-- A centre_specific batch is only visible to centres listed in
-- batch_centre_visibility — without this, a batch defaulted to
-- centre_specific above would be invisible even to its own owning centre.
-- Mirrors the backfill's seeding of the owning centre_id into the join table.
CREATE OR REPLACE FUNCTION public.seed_batch_centre_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visibility = 'centre_specific' AND NEW.centre_id IS NOT NULL THEN
    INSERT INTO public.batch_centre_visibility (batch_id, centre_id)
    VALUES (NEW.id, NEW.centre_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_batch_centre_visibility ON public.course_batches;
CREATE TRIGGER trg_seed_batch_centre_visibility
  AFTER INSERT ON public.course_batches
  FOR EACH ROW EXECUTE FUNCTION public.seed_batch_centre_visibility();
