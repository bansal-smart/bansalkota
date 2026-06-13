# CBT Question UI Fixes

Three small, scoped fixes to the test-taking interface and the docx importers.

## 1. Duplicate question image

**Cause:** The docx importers embed `<img>` tags inline inside `question_text` (via `replaceMarkersWithUrls`) AND also set `question_image_url` to the first stem image. `TestTakingPage` renders both → image appears twice.

**Fix:** In both importers, set `question_image_url` to `null` whenever `stemHtml` already contains an `<img` tag. Keeps backward compatibility for stems that have no inline marker.

Files:
- `src/components/DocxCommonImportDialog.tsx` (line ~238)
- `src/components/DocxBulkImportDialog.tsx` (line ~206)

## 2. Integer question rejects decimals

**Cause:** `NumericInput` disables the `.` key when `format === "integer"`.

**Fix:** Allow decimal input for all numeric question types (integer + numerical). Set `allowDecimal = true` unconditionally and update the helper text to say "Enter a number (decimals allowed)."

File: `src/pages/TestTakingPage.tsx` (NumericInput, ~line 879)

## 3. Options A, B, C, D shown vertically — make horizontal

**Cause:** Single-correct and multi-correct option lists use `space-y-2` (stacked).

**Fix:** Use a responsive grid:
- mobile: `grid-cols-1`
- sm and up: `grid-cols-2`
- lg and up: `grid-cols-4` (all four on one row)

Apply to both the multi-select (`isMulti`) and single-select option blocks. Match-the-following and Numeric inputs are untouched.

File: `src/pages/TestTakingPage.tsx` (lines ~663–704)

## Out of scope

No DB/schema changes. No changes to QuestionEditorDialog, scoring, or publish flow.
