## Problem

`Open window (entry closes at)` = `starts_at + open_window_minutes`. After this moment, the **Start Test** button must disappear/disable for every student who has not already started. Today it still appears because:

1. **`TestInstructionsPage.tsx`** computes `entryClosed` as `!hasExistingAttempt && now > entryDeadline`. The `!hasExistingAttempt` bypass means anyone who ever opened/started the test can keep clicking Start. Combined with the way attempts may get created on visit, this effectively never blocks. The check should be purely time-based — entry window is about *starting a new attempt*, not about whether a row exists.
2. **`CbtLiveTestsPage.tsx`** (kiosk listing) never checks `open_window_minutes` at all. It only gates on `starts_at` / `ends_at`, so the Start button stays enabled past the entry deadline.
3. Server side: `tests/{slug}/take` (the page that actually creates the attempt) does not re-validate the entry window, so a stale tab can still POST a new attempt after the cutoff.

## Fix

1. **`src/pages/TestInstructionsPage.tsx`**
   - Remove the `hasExistingAttempt` lookup and the `!hasExistingAttempt` guard.
   - `entryClosed = entryDeadline !== null && now > entryDeadline`.
   - Keep the existing "Entry window closed" banner and disabled-button copy, but allow students who already have an in-progress attempt to *resume* via a separate "Resume Test" path (detect existing non-submitted attempt and, if found, show Resume instead of Start — Resume bypasses entryClosed but still respects `ends_at`). This preserves the original intent of not locking out a student mid-exam.

2. **`src/pages/CbtLiveTestsPage.tsx`**
   - Include `open_window_minutes` in the `LiveTest` type and RPC selection (or fetch alongside).
   - Compute `entryDeadline` the same way and add `entryClosed` to the per-card state.
   - When `entryClosed`, show a "Entry closed" badge and disable Start. Same Resume-if-existing-attempt carve-out as above.
   - If `cbt_live_tests_for_batch` does not already return `open_window_minutes`, fetch the needed fields from `tests` for the returned IDs in a single follow-up query (no SQL/RPC change needed).

3. **`src/pages/TestTakePage.tsx`** (server-of-truth for attempt creation)
   - Before inserting a brand-new `test_attempts` row, re-check `starts_at - 60s ≤ now ≤ min(ends_at, starts_at + open_window_minutes*60s)`. If outside, redirect back to the instructions page with a toast. Resuming an existing attempt is still allowed up to `ends_at`.

No DB/schema changes. No edge-function changes. Strictly presentation + client-side guard logic on three files.

## Acceptance

- A test with `starts_at = T`, `open_window_minutes = 10`: at `T+11min` a fresh student sees a disabled Start button + "Entry window closed" message on both `/tests/:slug` and the CBT kiosk list.
- A student who already started before `T+10min` still sees a working **Resume Test** button until `ends_at`.
- Attempting to hit `/tests/:slug/take` directly after the entry window without an existing attempt bounces back to instructions.
