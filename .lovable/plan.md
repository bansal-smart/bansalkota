## Goals

1. Student sidebar "Doubts" badge must reflect real-time count of pending doubts (no manual refresh).
2. Each doubt should belong to one teacher only — other teachers must not see it.

---

## Problem analysis

**Dynamic count**
- `useDoubts("mine")` already subscribes to realtime and reloads. The badge derives from `doubts.filter(d => d.status !== "answered").length`.
- The likely reason the count doesn't update live: the `doubts` table is in the realtime publication, but `REPLICA IDENTITY` is not set to `FULL`, so UPDATE payloads don't carry enough data and changes for the user's row may not be delivered consistently. Also the answer flow updates `status` via a trigger on `doubt_answers` — both are listened to, but without `REPLICA IDENTITY FULL` on `doubts`, UPDATE events can be silently dropped from RLS-filtered streams.
- Fix: set `REPLICA IDENTITY FULL` on `doubts` and `doubt_answers`, and re-add to publication. Also tighten the badge to refetch on focus as a safety net.

**Doubt isolation per teacher**
- Current RLS lets ANY teacher/staff/admin SELECT all doubts.
- Schema already has `doubts.assigned_teacher_id` (unused).
- Fix: assign each new doubt to one teacher at creation time (round-robin / first available) and restrict teacher SELECT/UPDATE to only doubts where `assigned_teacher_id = auth.uid()`. Staff/admin keep full access.

---

## Plan

### 1. Database migration

```sql
-- Realtime reliability for doubts
ALTER TABLE public.doubts REPLICA IDENTITY FULL;
ALTER TABLE public.doubt_answers REPLICA IDENTITY FULL;

-- Helper: pick a teacher (least-loaded, fallback random)
CREATE OR REPLACE FUNCTION public.pick_teacher_for_doubt()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  LEFT JOIN public.doubts d
    ON d.assigned_teacher_id = ur.user_id AND d.status <> 'answered'
  WHERE ur.role = 'teacher'
  GROUP BY ur.user_id
  ORDER BY COUNT(d.id) ASC, random()
  LIMIT 1;
$$;

-- Auto-assign on insert
CREATE OR REPLACE FUNCTION public.assign_doubt_to_teacher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_teacher_id IS NULL THEN
    NEW.assigned_teacher_id := public.pick_teacher_for_doubt();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER doubts_assign_teacher
BEFORE INSERT ON public.doubts
FOR EACH ROW EXECUTE FUNCTION public.assign_doubt_to_teacher();

-- Backfill existing unassigned doubts
UPDATE public.doubts SET assigned_teacher_id = public.pick_teacher_for_doubt()
WHERE assigned_teacher_id IS NULL;

-- Replace teacher SELECT/UPDATE policies
DROP POLICY "Teachers and staff view all doubts" ON public.doubts;
DROP POLICY "Teachers and staff update doubts" ON public.doubts;

CREATE POLICY "Assigned teacher views own doubts" ON public.doubts
FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(),'teacher') AND assigned_teacher_id = auth.uid())
  OR has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')
);

CREATE POLICY "Assigned teacher updates own doubts" ON public.doubts
FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(),'teacher') AND assigned_teacher_id = auth.uid())
  OR has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')
)
WITH CHECK (
  (has_role(auth.uid(),'teacher') AND assigned_teacher_id = auth.uid())
  OR has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')
);

-- doubt_answers: teachers can answer only assigned doubts
DROP POLICY "Teachers staff and AI insert answers" ON public.doubt_answers;
CREATE POLICY "Teachers answer only assigned doubts" ON public.doubt_answers
FOR INSERT TO authenticated
WITH CHECK (
  responder_id = auth.uid() AND (
    has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')
    OR (has_role(auth.uid(),'teacher') AND EXISTS (
      SELECT 1 FROM public.doubts d
      WHERE d.id = doubt_id AND d.assigned_teacher_id = auth.uid()
    ))
  )
);
```

### 2. `src/hooks/useDoubts.ts`
- Keep current realtime subscription (it's correctly built).
- Add a `visibilitychange` / `focus` reload as a safety net so the badge syncs when the tab regains focus.

### 3. `src/pages/TeacherDoubtQueuePage.tsx`
- No code change needed — RLS now filters automatically. Each teacher will see only their assigned doubts.

---

## Files touched

- `supabase/migrations/<new>.sql` — schema + policy changes
- `src/hooks/useDoubts.ts` — focus-based safety refetch

## Out of scope

- Manual reassignment UI for staff (can add later).
- Load-balancing strategy beyond least-pending-count.