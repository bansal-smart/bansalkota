-- Batch visibility control: lets a Super Admin mark a course_batches row as
-- Global (all centres), Centre Specific (an explicit set of centres), or
-- Disabled (nobody). Previously the only mechanism was course_batches.centre_id
-- itself: NULL meant "every centre" (the PAN-India batches) and a single
-- centre_id meant "only that one centre" (see docs/adr/0001 and
-- 20260813060000_centralize_pan_india_batches.sql) — there was no way to open
-- a batch to a curated subset of centres, and no "disabled" state distinct
-- from is_active (which today isn't actually enforced anywhere as a
-- visibility gate, just a cosmetic Active/Inactive badge).
--
-- centre_id keeps meaning "owning centre" (who can manage it, per the
-- existing RLS policies below) — decoupled from reach, the same split
-- already used for courses/tests via is_global (ADR 0001), just modelled as
-- a 3-state enum + join table here since "reach" needs to support an
-- arbitrary subset of centres rather than all-or-one.

DO $$ BEGIN
  CREATE TYPE public.batch_visibility AS ENUM ('global', 'centre_specific', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.course_batches
  ADD COLUMN IF NOT EXISTS visibility public.batch_visibility NOT NULL DEFAULT 'global';

CREATE TABLE IF NOT EXISTS public.batch_centre_visibility (
  batch_id uuid NOT NULL REFERENCES public.course_batches(id) ON DELETE CASCADE,
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, centre_id)
);

ALTER TABLE public.batch_centre_visibility ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can already read course_batches (mirrors that
-- table's own permissive read policy) — client-side scoping logic needs to
-- read this to know whether the caller's own centre is in a batch's allow-list.
DROP POLICY IF EXISTS "Anyone can view batch centre visibility" ON public.batch_centre_visibility;
CREATE POLICY "Anyone can view batch centre visibility" ON public.batch_centre_visibility
  FOR SELECT TO authenticated USING (true);

-- Managing which centres see a centre_specific batch is a Super Admin (or
-- admin) action, same actor set as "Admins manage batches" on course_batches.
DROP POLICY IF EXISTS "Admins manage batch centre visibility" ON public.batch_centre_visibility;
CREATE POLICY "Admins manage batch centre visibility" ON public.batch_centre_visibility
  FOR ALL TO authenticated
  USING (is_admin_or_super(auth.uid()))
  WITH CHECK (is_admin_or_super(auth.uid()));

-- Backfill: preserve exactly today's real-world reach for every existing row.
-- Global/PAN-India batches (centre_id IS NULL) already default to 'global' —
-- set explicitly for clarity, not just relying on the column default.
UPDATE public.course_batches SET visibility = 'global' WHERE centre_id IS NULL;

-- Every centre-owned batch today is only ever visible to its one owning
-- centre, so that becomes 'centre_specific' with exactly that centre seeded
-- into the allow-list — no behavior change until a Super Admin edits it.
UPDATE public.course_batches SET visibility = 'centre_specific' WHERE centre_id IS NOT NULL;

INSERT INTO public.batch_centre_visibility (batch_id, centre_id)
SELECT id, centre_id FROM public.course_batches WHERE centre_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enforce "disabled" as a hard revoke at the RLS layer (not just a cosmetic
-- list-page filter) — a disabled batch must never be selectable by anyone
-- other than an admin managing it.
DROP POLICY IF EXISTS "Anyone can view active batches" ON public.course_batches;
CREATE POLICY "Anyone can view active batches" ON public.course_batches
  FOR SELECT TO authenticated
  USING (((is_active = true) AND (visibility <> 'disabled')) OR is_admin_or_super(auth.uid()));
