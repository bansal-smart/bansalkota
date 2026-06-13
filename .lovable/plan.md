## Goal

Introduce a second test-authoring flow called **Common method** while keeping all current behaviour as **Master method**. Common-method tests are built from a "cropped" Word file where every question is one printed block (stem + four options together) plus a single answer-key letter/number.

## 1. Rename existing flow → "Master method"

- Wherever the UI currently says "Bulk import" / "Docx import" / "Standard" for test creation, label it **Master method**. No behaviour change.
- Touch points: Test Platform Hub tabs, Create Test page method picker, DocxBulkImportDialog title, AdminImportBatchesPage labels.

## 2. New "Common method" entry point

- On `CreateTestPage` and the Test Platform Hub "Imports" tab, add a second card: **Common method (cropped .docx)**.
- Opens a new dialog `DocxCommonImportDialog` (separate from the Master one — different parser, different preview).
- Test row gets `import_method: 'common' | 'master'` (default `master`) so we can show a badge on existing tests.

## 3. Common-method .docx parser

New file `src/lib/docxImport/parseCommonDocx.ts`.

Format detected from the uploaded sample:
- Document is a sequence of 3-column tables (or one big table). Each "question block" =
  - Row 1: `[number] [stem + (A) (B) (C) (D) lines printed together] [answer]`
  - Rows 2–5: empty `(A) (B) (C) (D)` placeholder rows (skip).

Parser steps:
1. Use mammoth to convert to HTML preserving images.
2. Walk top-level tables; for each row whose first cell is a pure integer and third cell is a non-empty A/B/C/D/integer token, treat it as a question.
3. **Stem rendering** — render the middle cell's HTML (text + inline images + LaTeX) into a single PNG via `html-to-image` (already in deps; otherwise add) at ~1200px width. That PNG becomes the stem image. The cell's plain text is kept as `stemText` for search/accessibility.
4. **Options** — fixed labels `A / B / C / D` with empty `text` (renderer will show just the letter chip). Integer questions get no options.
5. **Type detection** from the answer cell, per user's choice:
   - `^[A-D]$` → `mcq-single`
   - 2–4 distinct letters (`AB`, `A,C`, `A C D`) → `mcq-multi`
   - Pure number → `integer` (value stored in `numerical_answer`)
   - Override is editable in the preview (next step).
6. **Marks** auto-applied: single `+4/-1`, multi `+4/-2` with `partial_marking=true`, integer `+4/0`.

## 4. Common-method preview dialog

New `DocxCommonImportDialog.tsx`:
- Drop zone → runs parser → shows table:
  | # | Stem preview (image thumbnail) | Detected type (dropdown) | Answer | Marks |
- Dropdown lets admin flip type per question; changing to integer reveals a numeric input pre-filled from any digits found.
- Bulk actions: "Set all to single-correct", "Re-detect types".
- "Import N questions" → uploads stem images to `question-images` bucket via existing `uploadImages.ts` (extended with a `stem-image` slot), inserts rows into `test_questions` with `question_type`, `numerical_answer`, marks, `correct_answer`, and the public image URL stored in a new `stem_image_url` column (nullable; backwards-compatible).

## 5. Student-side rendering

- `test_questions` already supports rich HTML. Update `TestTakingPage` question renderer: if `stem_image_url` is set and `question_text` is empty/short, render the image (`<img>` with `max-w-full`) as the stem. Options render as plain letter chips when option text is empty.
- No other student-side changes.

## 6. Database

Single migration adds two nullable columns and keeps everything backwards-compatible:

- `tests.import_method text default 'master'`
- `test_questions.stem_image_url text`

(No new tables, no policy changes.)

## 7. Files

**Created**
- `src/lib/docxImport/parseCommonDocx.ts`
- `src/components/DocxCommonImportDialog.tsx`
- `supabase/migrations/<ts>_common_method.sql`

**Edited**
- `src/pages/CreateTestPage.tsx` — method picker (Master | Common)
- `src/pages/AdminTestPlatformHub.tsx` — Imports tab gets two buttons
- `src/components/DocxBulkImportDialog.tsx` — relabel to "Master method"
- `src/pages/AdminImportBatchesPage.tsx` — show method column
- `src/pages/AdminTestsPage.tsx` — badge per row (Master/Common)
- `src/lib/docxImport/uploadImages.ts` — add `stem-image` slot helper
- `src/pages/TestTakingPage.tsx` — render `stem_image_url` when present

## Technical notes

- Rendering cell HTML → PNG uses `html-to-image` (`toPng`) on a hidden offscreen `<div>`; LaTeX is rendered via existing `MathRenderer` before snapshot so equations are crisp.
- Images live in the existing private `question-images` bucket; signed URLs already handled by `uploadImages.ts`.
- No change to `submit_test_attempt` RPC — marking already supports all three types.
- All existing tests automatically become `import_method='master'` via the column default.
