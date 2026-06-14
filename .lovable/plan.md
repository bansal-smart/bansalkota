## Plan

1. **Fix imported-question deletion in the test editor**
   - Make **Remove from test** and **Delete from test + bank** delete selected imported rows from `test_questions` immediately when the test already exists.
   - For imported rows, use their real `test_questions.id`, not only local state.
   - After deletion, reload the test question list and refresh test stats so the count changes from 150 to the real number.

2. **Fix “delete from test + bank” behavior**
   - If selected questions came from the bank (`bank_id` exists), delete those bank records too.
   - If selected questions were common-imported directly into the test, explain via toast that no bank copy exists, and still delete them from the test.
   - Remove the misleading “save to persist” behavior for imported rows because the current save path does not persist deletions for imported tests.

3. **Prevent repeat import duplicates**
   - Before common import inserts into a test, check existing questions in that same test for matching imported content from the same file.
   - Skip duplicates and show a clear message like “75 skipped, already in this test” instead of appending again.
   - Keep appending only genuinely new questions.

4. **Make subject range tagging reliable**
   - Replace the initial full `1–N Physics` range with explicit, non-overlapping ranges when admins use **Auto-split equally** or add custom ranges.
   - Ensure the subject preview and saved rows use the final range mapping consistently: Q1–25 Physics, Q26–50 Chemistry, Q51–75 Mathematics for JEE.
   - Update validation to use the same final subject resolver as saving.

5. **One-time cleanup for the current test**
   - Remove the older duplicate all-Physics import batch from `trial-13th-mqcqzjfd` and keep the newer correctly tagged 75-question batch.
   - Recalculate the test total questions, marks, and subject list afterward.

## Files likely changed
- `src/pages/CreateTestPage.tsx`
- `src/components/DocxCommonImportDialog.tsx`

## Database data cleanup
- Delete only duplicate `test_questions` rows for the affected test/import batch.
- No schema migration needed.