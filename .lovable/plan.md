## Add "Open window" to test schedule

Lets admin define how long after start time a student is still allowed to **begin** the test for the first time. After the window closes no new student can start, but students already in the test continue normally. Admin can extend the window anytime by editing the test.

### 1. Schema
- Add column `tests.open_window_minutes integer` (nullable). `NULL` = no restriction (current behaviour).

### 2. Create / Edit Test — `src/pages/CreateTestPage.tsx`
- Add state `openWindowMinutes` (number | "").
- Load existing value in the edit-prefill block (~line 263).
- Include `open_window_minutes` in `buildSchedulePayload` (~line 445).
- Replace the schedule grid (~line 975) with a **2×2 grid** (`md:grid-cols-2`):
  - Row 1: Test date · Start time
  - Row 2: Open window (minutes) · End time (results release)
- Helper text under the heading explains: "Open window — students can start the test up to this many minutes after the Start time. Leave blank for no limit."
- Update the "Scheduled:" summary line to include `… opens 14:30, entry closes at 14:45 …` when set.

### 3. Enforcement — `src/pages/TestInstructionsPage.tsx`
- Extend the `test` type with `open_window_minutes` and select it.
- Compute `entryDeadline = starts_at + open_window_minutes * 60_000` when both are set.
- Compute `hasExistingAttempt` by querying `test_attempts` for the current user + test (any row, including in-progress or submitted). This lets a student who already started re-enter even if the window has closed.
- Block start when `!hasExistingAttempt && now > entryDeadline`:
  - Disable the Start Test button.
  - Show an amber/red banner: "Entry window has closed. Contact your centre admin if you believe this is an error."
- Existing `closed` (ends_at) check stays as-is.

### 4. Types
- After the migration runs, `src/integrations/supabase/types.ts` regenerates automatically; no manual edit.

### Out of scope
- No new server-side RPC. Enforcement is client-side at instructions screen (matches existing `notYetOpen` / `closed` pattern). Admins extend by editing the test (already supported).
- No change to in-progress students or to result release logic.
