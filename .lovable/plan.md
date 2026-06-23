# Plan: Admin force-submit + relaxed proctoring warnings

## 1. Admin "Force-Submit Pending" on Result Sheet

**Where:** `src/pages/AdminTestResultPage.tsx` — add a new pill-style button next to `Excel` / `Master Result PDF`, labeled **"Submit pending"** with a count badge (e.g., "Submit pending (3)").

**Behavior:**
- Visible only to `admin` / `super_admin`.
- Shows count of attempts for this test whose `status = 'in_progress'` (started but never submitted).
- Click → confirm dialog: *"Force-submit N pending attempts? Their current saved answers will be graded as their final submission."*
- On confirm → call a new RPC `admin_force_submit_pending(_test_id uuid)` that:
  1. Finds all `test_attempts` for the test with `status = 'in_progress'`.
  2. For each, runs the same scoring logic as `submit_test_attempt` (using last-persisted answers from `test_attempt_answer_snapshots`), sets `status = 'submitted'`, `submitted_at = now()`, `auto_submitted = true`, `force_submitted_by = auth.uid()`.
  3. Recomputes ranks / leaderboard cache.
  4. Returns `{ submitted_count }`.
- After success: toast `"Submitted N attempts"`, refetch the result sheet.
- Audit: add `force_submitted_by uuid` + `force_submitted_at timestamptz` columns to `test_attempts` so we know which were admin-forced.

**Security:** RPC is `SECURITY DEFINER` and starts with `if not has_role(auth.uid(),'admin') and not has_role(auth.uid(),'super_admin') then raise exception ...`.

## 2. Relax proctoring warnings in TestTakingPage

**File:** `src/pages/TestTakingPage.tsx` (lines 270–316).

**Current:** Warning fires on BOTH `visibilitychange` (hidden) AND `window blur`. `blur` fires when clicking the taskbar, system notifications, dev-tools, alt-tab to another app, etc. — too aggressive.

**Change:**
- Remove the `window.addEventListener("blur", onBlur)` listener entirely.
- Keep only `document.addEventListener("visibilitychange", ...)` which fires when:
  - User switches to another browser tab, OR
  - User opens a new tab, OR
  - The browser window itself is fully hidden (minimized).
- This means clicking on the taskbar, OS notifications, or other apps while the browser remains visible will NOT trigger a warning.
- Keep the 3-strike auto-submit logic, debounce, and `contextmenu` block unchanged.

Minimization technically still fires `visibilitychange`, which is acceptable — the user's two listed cases (tab switch, new tab) are the primary triggers, and minimizing is a clear "leaving the test" signal.

## Technical Details

**New migration:**
```sql
alter table public.test_attempts
  add column if not exists force_submitted_by uuid references auth.users(id),
  add column if not exists force_submitted_at timestamptz;

create or replace function public.admin_force_submit_pending(_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int := 0;
  _attempt record;
begin
  if not (has_role(auth.uid(),'admin') or has_role(auth.uid(),'super_admin')) then
    raise exception 'forbidden';
  end if;

  for _attempt in
    select id from public.test_attempts
    where test_id = _test_id and status = 'in_progress'
  loop
    -- reuse existing scoring path
    perform public.score_test_attempt(_attempt.id);
    update public.test_attempts
       set status = 'submitted',
           submitted_at = coalesce(submitted_at, now()),
           auto_submitted = true,
           force_submitted_by = auth.uid(),
           force_submitted_at = now()
     where id = _attempt.id;
    _count := _count + 1;
  end loop;

  -- refresh leaderboard cache for this test
  perform public.refresh_test_leaderboard(_test_id);

  return jsonb_build_object('submitted_count', _count);
end;
$$;

grant execute on function public.admin_force_submit_pending(uuid) to authenticated;
```
(Function names `score_test_attempt` / `refresh_test_leaderboard` will be verified against the existing SQL before writing the final migration.)

**Frontend:**
- `AdminTestResultPage.tsx`: derive `pendingCount` from already-loaded roster (students with status `in_progress`); add button + AlertDialog; call RPC via `supabase.rpc('admin_force_submit_pending', { _test_id })`; refetch on success.
- `TestTakingPage.tsx`: remove the blur listener and its cleanup.

## Out of Scope
- No change to the 3-strike threshold or auto-submit-on-3rd-violation logic.
- No change to absent students (those who never started) — they remain ABS.
