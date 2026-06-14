## Goal
Add bulk selection on the test editor (`/admin/tests/:slug/edit`) so admins can multi-select questions and either remove them from this test only, or remove them from this test AND permanently delete them from the Question Bank.

## Changes (only `src/pages/CreateTestPage.tsx`)

### 1. Selection state
- Add `selectedIdx: Set<number>` state for which question rows are checked.
- Reset on import / save / question reorder length change.

### 2. Bulk toolbar (above the questions list, shown when `questions.length > 0`)
- "Select all" / "Clear" toggle (checkbox in header).
- Counter: `N selected`.
- Two action buttons (disabled when none selected):
  - **Remove from test** — drops them from local `questions` state (final save commits to DB as today via the existing replace-all logic in `submit()`).
  - **Delete from test + Question Bank** — confirm dialog (`useConfirm`), then:
    1. Collect `bank_id` values from the selected rows that originated from the bank (`q.bank_id` present).
    2. If any: `supabase.from("question_bank").delete().in("id", bankIds)` — surface error toast on failure.
    3. Remove the selected rows from local `questions` state regardless.
    4. Toast: "Removed X questions · Y deleted from bank".

### 3. Per-row checkbox
- Add a small checkbox at the start of each question row (next to the `GripVertical` handle).
- Bound to `selectedIdx.has(i)`.

### 4. Safety / UX
- Confirm dialog for bank deletion clearly states it is permanent and affects other tests that reference the same bank question.
- After bulk remove, re-key remaining rows (indexes auto-shift — fine because list is index-keyed today).
- Existing single-row trash button stays.

## Out of scope
- No DB schema or migration changes (RLS on `question_bank` already allows admin deletes).
- No changes to the question bank panel itself.
- No changes to `AdminTestDetailPage`'s "Delete all questions" (already exists).

## Technical notes
- Imports to add: nothing new (`useConfirm`, `Trash2`, `supabase`, `toast` already imported).
- The save flow (`submit()`) already does `DELETE ... WHERE test_id = ?` + reinsert, so bulk-remove from test needs no extra DB call — it persists on next Save. Bank deletion is the only direct DB call required.