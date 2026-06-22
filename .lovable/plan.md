## Goal

Make "Master import" on the New Test page reliably accept one canonical Word format that supports every question type Bansal uses — SCQ, MCQ, Integer (single value or range), Numerical/Decimal (single value or range), and Match the Following — with images and equations in the stem and in each option. Ship a ready-to-use template file and an "Instructions" button next to Master import so any teacher can produce a perfect file.

## The STEM template format (single source of truth)

Each question is a block separated by a blank line. Order is fixed:

```text
Topic: Kinematics                       (optional, carries to next Qs until changed)
Type: SCQ                               (SCQ | MCQ | Integer | Numerical | Match)

1. Question stem text. Equations inline with $...$ or display $$...$$.
   [Insert image here — paste directly into Word]

(A) Option A text or image
(B) Option B text or image
(C) Option C text or image
(D) Option D text or image

Answer: B
Solution: Optional explanation, supports $LaTeX$ and images.
```

Per-type Answer line:

- SCQ → `Answer: B` (or `Answer: 2`)
- MCQ → `Answer: A, C` (or `Answer: 1,3,4`)
- Integer → `Answer: 9` or `Answer: 5-9` (range)
- Numerical/Decimal → `Answer: 3.14` or `Answer: 3.10-3.18` (range, decimals allowed)
- Match → use a 2-column table with header row `Column A | Column B`, rows `A | P`, `B | Q`, …, then `Answer: A-Q, B-S, C-P, D-R`. Options/items can be text or images.

Images in any slot (stem, A/B/C/D, Column A/B rows, Solution) are auto-attached to that slot. LaTeX and native Word equations are preserved.

## Deliverables

### 1. Template file
- New `public/templates/master-question-template.docx`, generated with `docx-js` and validated.
- Contains one fully worked example per question type (SCQ, MCQ, Integer single, Integer range, Numerical decimal, Numerical range, Match-the-following with table).
- Each example uses the exact `Type:` / `Topic:` / numbered stem / `(A)`–`(D)` / `Answer:` / `Solution:` layout.
- Uses Arial 11 pt body, bold question numbers, light-gray instructional preface paragraph.

### 2. Instructions dialog
- New `MasterImportInstructions` modal component.
- Trigger: an "Instructions" button rendered next to "Master import" on `CreateTestPage.tsx`, and a secondary "View instructions" link inside `DocxBulkImportDialog`'s upload step.
- Content (rendered as styled markdown):
  - Why this format exists
  - Block layout diagram (same as above)
  - Per-type table: Type tag → Answer-line syntax → Example
  - Image rules (paste inline; one per slot; PNG/JPG ≤ 5 MB)
  - LaTeX & equation rules (`$...$`, `$$...$$`, Word native equations OK)
  - Match-the-Following table requirements
  - Common pitfalls (mixed numbering, missing `Answer:`, `(A)` vs `A.`)
  - "Download template" button (links to `/templates/master-question-template.docx`)

### 3. Parser hardening (`src/lib/docxImport/parseDocx.ts`)
- Honor an explicit `Type: SCQ|MCQ|Integer|Numerical|Match` line per question. When present it overrides auto-detection; when absent we fall back to the existing answer-line inference.
- Treat `Numerical` and `Decimal` synonyms; route decimal values to `numerical`, integer ranges still map to `integer` with `{min,max}`.
- Tighten the Match table detector: accept `Column A`/`Column B`, `List I`/`List II`, and `A|P` short-header variants.
- Keep current LaTeX/image/per-slot logic untouched.

### 4. Import dialog UX (`src/components/DocxBulkImportDialog.tsx`)
- Replace the cryptic "Arke format" copy with: "Master Question Template — one block per question. Click Instructions for the full guide."
- Add two buttons in the upload step: **Download template** and **View instructions** (opens the modal from #2).
- On parse failure, show a one-line tip: "Not detecting questions? Open Instructions and compare your file to the template."
- Show per-question detected `Type` badge in the preview list so the teacher can spot mis-classified questions and re-pick from a dropdown before saving.

### 5. CreateTestPage entry point (`src/pages/CreateTestPage.tsx`)
- Next to the existing "Master import" button add a small `?` icon button → opens the instructions modal without opening the importer.

## Technical details

- Template generation script: `scripts/build-master-template.mjs` using `docx` (Document/Paragraph/Table/TableRow/TableCell/ImageRun). Output written to `public/templates/master-question-template.docx`. Add an npm script `build:template` so it can be regenerated; commit the built file too so users get it without running the script.
- The parser change is additive — a new `extractTypeLine(text)` helper plus a `forcedType` field on the buffer, applied in `flushBuffer` before the existing inference.
- No DB or RLS changes. Grants on `question_bank`, `test_questions`, `question_import_batches` are already in place from the previous migration.
- No edge functions touched.

## Files

- New: `public/templates/master-question-template.docx`
- New: `scripts/build-master-template.mjs`
- New: `src/components/MasterImportInstructions.tsx`
- Edit: `src/lib/docxImport/parseDocx.ts` (Type line + Match detector + numerical/decimal alias)
- Edit: `src/components/DocxBulkImportDialog.tsx` (copy, buttons, per-Q Type badge + dropdown)
- Edit: `src/pages/CreateTestPage.tsx` (instructions `?` button next to Master import)

## Out of scope

- Changing the "Common" cropped-table importer (`DocxCommonImportDialog`) — it stays as-is.
- Backend changes, payments, auth, schema migrations.
