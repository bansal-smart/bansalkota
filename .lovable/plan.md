## Goals

1. Fix the bug where Common .docx import "succeeds" in the UI but no questions appear in the test (e.g. "trial cbt lab" — batch row created, `status: in_progress`, but 0 rows in `test_questions`).
2. Add the **Common import** option to the Question Bank toolbar (currently only Master "Word import" exists).
3. In **Create Test**, add a **Select all on page** action alongside drag-and-drop so an admin can bulk-add many bank questions in one click.

## Findings

- `question_import_batches` for the broken test shows `status='in_progress'`, `question_count=75`, empty `error_log`, and 0 rows in `test_questions`. So either the row insert threw after the await and the dialog was dismissed before the catch path updated the batch, or the rows were inserted and later wiped by `submit()` at line 475 of `CreateTestPage.tsx` (`delete().eq("test_id", resolvedTestId)`), which runs on every "Save"/"Publish" of a non-imported edit even when the local `questions` state is empty.
- Reload of imported questions depends on `reloadKey` re-running the edit-mode `useEffect`, which already maps `import_batch_id || source_filename` → `imported: true`. That logic is correct; the rows just aren't there.
- `DocxCommonImportDialog` and `DocxBulkImportDialog` set `import_batch_id` + `source_filename`, but the insert path doesn't refresh the batch row to `completed` until later, leaving stuck `in_progress` batches with no diagnostic when something fails.

## Plan

### 1. Make import resilient and visible

`src/components/DocxCommonImportDialog.tsx` and `src/components/DocxBulkImportDialog.tsx`:
- Wrap the `test_questions` insert in a try/catch. On any thrown error (not just `insErr`), update the batch row to `status='failed'` with the error message in `error_log`, surface it via `toast.error`, and keep the dialog on the preview step instead of silently closing.
- After a successful insert, immediately update the batch row to `status='completed'` and re-run `syncTestStats(targetTestId)` (already imported) before calling `onImported()`.
- Verify with a `select('id', { count: 'exact', head: true })` post-insert that the count matches `rows.length`; if not, mark failed.

`src/pages/CreateTestPage.tsx`:
- Guard `submit()` so it never deletes existing `test_questions` when the local `questions` array is empty (currently it does, which can wipe an imported test if the user hits Save before the reload finishes). If `questions.length === 0` and `importedQuestionCount.current > 0`, route through `publishImportedDraft()` instead.
- Backfill recovery: re-run the failed import (or surface a "Retry import" button on a batch with `status='in_progress'` older than a few minutes) — out of scope unless requested; for now the toast + failed status is enough so the user knows what happened.

### 2. Common import in Question Bank

`src/components/QuestionBankPanel.tsx`:
- Add a second toolbar button next to the existing "Word import" labelled **"Common import"** that opens `DocxCommonImportDialog` in question-bank mode.

`src/components/DocxCommonImportDialog.tsx`:
- Add a new optional prop `target: "test" | "bank"` (default `"test"`).
- When `target === "bank"`, skip the test picker, skip `tests` update, and insert into `public.question_bank` instead of `public.test_questions`. Map fields: `subject`, `topic`, `question_text`, `question_image_url`, `question_type`, `options`, `option_images`, `correct_answer`, `numerical_answer`, `marks_correct/wrong/unanswered`, `partial_marking`, `created_by = user.id`, `import_batch_id`, `source_filename`. Use `target_type: "bank"` on the batch row.
- After success show the same toast and call `onImported()` so the bank list refreshes.

### 3. Select-all in Create Test (bank → test)

`src/components/QuestionBankPanel.tsx`:
- When `onAdd` is supplied (i.e. picker mode) and a new optional `onAddMany?: (qs: BankQuestion[]) => void` prop is provided, render a small toolbar above the list with:
  - "Select all on page" / "Clear" toggle (reuse existing `pageIds` + `selected` state which currently only renders in `tableView`/`manage` mode).
  - "Add N selected to test" button that calls `onAddMany(pageItems.filter(q => selected.has(q.id)))` then clears the selection.
- Show row-level checkboxes in the picker variant (compact card layout) as well, not only in tableView.

`src/pages/CreateTestPage.tsx`:
- Pass `onAddMany` to `<QuestionBankPanel>` (both the inline desktop instance and the Sheet on mobile). Implementation:
  - Filter out IDs already in `addedBankIds`.
  - Map remaining via `fromBank(q, { correct: correctMarks, wrong: wrongMarks })`.
  - Append to `questions` in one `setQuestions` call.
  - Toast `Added N questions`.

## Out of scope

- Auto-retry of stuck `in_progress` batches.
- Changes to the actual .docx parser.
- The unrelated "Rendered more hooks than during the previous render" warning — will look at it only if it surfaces from the touched files.
