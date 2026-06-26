# Dynamic Option Label Style (NEET-style "1,2,3,4" vs JEE-style "A,B,C,D")

Today every UI hard-codes `String.fromCharCode(65 + i)` so options always render as A, B, C, D. The .docx importer already understands both `(1)…(4)` and `(A)…(D)` markers, but that information is thrown away. We'll preserve it, combine it with the test's exam pattern, and use it everywhere options are shown.

## 1. Data

Add to `public.tests`:
- `option_label_style text` — `'numeric' | 'alpha'`, nullable. When null we infer from `exam_pattern` at render time (NEET → numeric, everything else → alpha).

(No change to `test_questions` / `question_bank`. Style is a paper-level decision, not per-question, which matches NEET/JEE reality.)

## 2. Importer — detect from the .docx

`src/lib/docxImport/parseDocx.ts` and `parseCommonDocx.ts`:
- While parsing options, count how many option markers were `(1)/1./1)` vs `(A)/A./A)`.
- Return a `detectedOptionStyle: 'numeric' | 'alpha' | null` alongside the parsed questions.

`src/components/DocxBulkImportDialog.tsx`, `DocxCommonImportDialog.tsx`, `BulkQuestionUploadDialog.tsx`:
- Pass `detectedOptionStyle` up to `CreateTestPage` via the existing `afterImport` callback / save path.
- When saving the test, set `option_label_style` using this precedence:
  1. Admin's explicit choice in the test form (new dropdown, see §4)
  2. Style detected from the imported docx
  3. Leave null → falls back to exam_pattern inference

Also display the detected style in the import preview (so admin sees "Options detected: 1, 2, 3, 4").

## 3. Render helper

New `src/lib/optionLabel.ts`:

```ts
export type OptionLabelStyle = 'numeric' | 'alpha';
export const resolveOptionStyle = (
  test: { option_label_style?: string | null; exam_pattern?: string | null }
): OptionLabelStyle =>
  test.option_label_style === 'numeric' || test.option_label_style === 'alpha'
    ? test.option_label_style
    : (test.exam_pattern ?? '').toUpperCase().includes('NEET') ? 'numeric' : 'alpha';
export const optionLabel = (i: number, style: OptionLabelStyle) =>
  style === 'numeric' ? String(i + 1) : String.fromCharCode(65 + i);
```

Replace every hard-coded `String.fromCharCode(65 + i)` for MCQ options with `optionLabel(i, style)`. Files touched:

- `src/pages/TestTakingPage.tsx` (lines 1036, 1056) — student attempt screen
- `src/pages/TestResponseSheetPage.tsx` (`optionLetter`)
- `src/pages/TestSubjectBreakdownPage.tsx` (line 206)
- `src/pages/AdminTestResultPage.tsx` (lines 770, 772, 784) — uses test row already in scope
- `src/pages/CreateTestPage.tsx` (line 1425) — editor preview
- `src/components/QuestionEditorDialog.tsx` (lines 182, 372) — accept `style` prop from caller
- `src/components/DocxBulkImportDialog.tsx` (line 763), `BulkQuestionUploadDialog.tsx` (line 470), `DocxCommonImportDialog.tsx` (line 251) — use detected style in preview

Match-following labels (P, Q, R, S) and chapter-quiz screens stay as-is — they aren't part of this request.

## 4. Admin control

In `CreateTestPage.tsx` settings panel, next to `exam_pattern`, add a small select:

> **Option label style** — Auto (follow exam pattern) · 1, 2, 3, 4 · A, B, C, D

"Auto" stores null. Default is Auto so existing tests pick up NEET→numeric / JEE→alpha automatically without any admin work.

## 5. Outcome

For the uploaded `NEET.docx`: exam pattern = NEET *and* importer detects numeric markers → test is saved with `option_label_style='numeric'` → student sees `1.` `2.` `3.` `4.` everywhere (taking the test, response sheet, admin result view). A JEE docx with `(A)…(D)` continues to render as A/B/C/D. Admin can always force one style from the test settings.
