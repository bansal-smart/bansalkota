# Plan: Attempts Reset, Palette Numbering, Admin Re-allow with Extra Time, Image Preload

## 1. Reset all test attempt data
Run a one-time SQL via migration to wipe attempt history so fresh test runs start clean.

```sql
TRUNCATE TABLE public.test_attempts RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.test_reattempt_requests RESTART IDENTITY CASCADE;
```

`test_reattempt_requests` is included so stale approvals don't carry over. Question bank, tests, students — all untouched.

## 2. Continuous question numbering in test window (palette + header)
**File:** `src/pages/TestTakingPage.tsx`

Currently each subject's palette numbers restart at 1 (Physics 1–25, Chemistry 1–25, Math 1–25). Change to use the **global question number** so Chemistry palette shows 26–50 and Math shows 51–75 — matching the real `position` on the question.

Changes:
- Palette grid (around line 776): replace `posIdx + 1` label with the question's global index → `i + 1`.
- Question header (line 641) "Question No. X": show `currentQ + 1` (global), not `subjectIndex + 1`.
- Position label (line 524): show `X / 75` global instead of `X / 25` per subject.
- Subject filter pills + topic pills behaviour unchanged — clicking Chemistry still jumps to its first question, but the box labels are 26, 27, 28…

No DB or scoring change.

## 3. Admin: Re-allow a submitted attempt with extra time
**Files:** `src/pages/AdminTestAttemptsPage.tsx` (UI), new RPC in migration.

Use case: student mis-submitted at 9:10 in a 9:00–12:00 window. Admin wants to let them resume / restart with the original 180 min or a custom duration (e.g. 150 / 190 min) without changing the test's global `ends_at` for everyone else.

### UI
On each submitted/auto-submitted attempt row, add a **"Re-allow with time"** action (super-admin + admin). Opens a dialog:
- Radio: **Resume same attempt** (keeps answers) | **Fresh attempt** (clears answers).
- Number input: **Extra minutes to allow** (default = test duration; min 1, max 600).
- Optional reason text.
- Confirm button → calls new RPC.

### RPC `admin_reopen_attempt(_attempt_id uuid, _extra_minutes int, _fresh boolean, _reason text)`
SECURITY DEFINER, admin-only. Behaviour:
- If `_fresh = true`: delete the existing attempt and insert a fresh `in_progress` row for the same user/test.
- If `_fresh = false`: set `status = 'in_progress'`, clear `score`, `correct_answers`, `percentile`, `submitted_at`, and (for the resume case) keep `answers` intact.
- Store an override window on the attempt so the timer uses it instead of the test's `ends_at`:
  - Add columns to `test_attempts`: `time_override_minutes int`, `time_override_started_at timestamptz`, `reopened_by uuid`, `reopened_reason text`.
  - Set `time_override_minutes = _extra_minutes`, `time_override_started_at = now()`, `started_at = now()` on reopen.
- Insert audit row into `test_reattempt_requests` with `status = 'approved'`, `reason = _reason`, `decided_by = auth.uid()`.

### Timer change in `TestTakingPage.tsx`
When loading the attempt, if `time_override_minutes` is set, use `time_override_started_at + override` as the deadline instead of `started_at + test.duration_minutes` and ignore the test's global `ends_at`. Falls back to existing logic otherwise.

### Out of scope
No change to the global `tests.ends_at`. Other students unaffected.

## 4. Preload all question images at test start (no per-question delay)
**File:** `src/pages/TestTakingPage.tsx`

Today images load lazily as the student navigates; signed-URL fetches + network latency cause visible blank boxes.

Plan:
- After questions are fetched but before/while the student clicks Start, kick off a **preload pass**: build a list of every `question_image_url` and every entry in `option_images[]`, dedupe, and create `new Image(); img.src = url` for each so the browser caches them.
- Track a `preloadProgress` count (loaded / total). On the Start screen, show a small line: "Loading images… 42 / 75". Start button stays enabled — preloading continues in the background.
- During the test, on the question card, if the current image isn't in the cache yet (we keep a `Set<string>` of loaded URLs), show a small inline **"Loading question…"** placeholder with a spinner over the image area until its `onLoad` fires. Replaces today's silent blank.
- No change to data model. Pure client-side. Storage signed URLs are already returned by the existing query.

## Technical details

- Files touched:
  - `src/pages/TestTakingPage.tsx` — palette/header numbering, preloader, timer override.
  - `src/pages/AdminTestAttemptsPage.tsx` — "Re-allow with time" button + dialog.
  - New migration:
    1. `TRUNCATE test_attempts, test_reattempt_requests`.
    2. `ALTER TABLE test_attempts ADD COLUMN time_override_minutes int, time_override_started_at timestamptz, reopened_by uuid, reopened_reason text`.
    3. `CREATE OR REPLACE FUNCTION admin_reopen_attempt(...)` with admin/super-admin guard via `is_admin_or_super`.
    4. GRANT EXECUTE on the function to `authenticated`.
- Scoring logic, tab-switch warnings, success/confirm dialogs, CBT login design — all untouched.

## Out of scope
- No change to test creation, question bank, or result PDF.
- No bulk reopen — admin acts per-attempt.
