## Problem

In the test creation/edit flow (`/admin/tests/new` → draft → `/admin/tests/:slug/edit`), editing a single question's correct/wrong marks does not stick. After save, the value snaps back to the test-level default (e.g. 4).

## Root cause

`src/pages/CreateTestPage.tsx`'s `submit()` short-circuits to `publishImportedDraft()` whenever any question is `imported` (line 516). `publishImportedDraft()` only updates the `tests` row — it never writes back `marks_correct` / `marks_wrong` (or other per-question edits) on the existing `test_questions` rows. So the UI state is discarded and the next load re-reads the original DB values, which match the test default.

The non-imported path (full delete + reinsert at lines 559 / 575) already saves per-question marks correctly, so this fix is scoped to the imported path.

## Fix

Update `publishImportedDraft()` in `src/pages/CreateTestPage.tsx` so that, before publishing, it persists per-question overrides for every question currently in the editor that has a DB id:

- For each `q` in `questions` with a truthy `q.id`, run `supabase.from("test_questions").update({ marks_correct: Number(q.marksCorrect), marks_wrong: Number(q.marksWrong) }).eq("id", q.id).eq("test_id", resolvedTestId)`.
- Batch them via `Promise.all`; surface the first error via `toast.error` and abort the publish.
- Keep the existing `tests` update and `syncTestStats` call afterwards so the test-level default + totals stay in sync.

No schema or RLS changes needed — the `test_questions` UPDATE policy already permits the test owner / admin to edit these columns.

## Verification

1. Open an existing test with imported questions, change one row's "+" marks from 4 → 3, click Publish.
2. Reopen the test editor: the edited row should still read 3 while other rows keep their original values.
3. Take the test as a student: scoring should use 3 for that question.
