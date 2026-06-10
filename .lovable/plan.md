
# Word (.docx) Bulk Question Import — Phase 5

Implement the bulk uploader that matches your sample format (`01_PCM_JEE_Main_Sample.docx`): numbered questions with inline diagrams, `(A)–(D)` options, and an answer-key table at the end. Images embedded in the doc are extracted, uploaded to storage, and rendered on the question screen during tests.

## 1. Storage for question images

- New **public** bucket `question-images` (read for everyone, write for admins/teachers only).
- Path layout: `question-images/{importBatchId}/q{n}_{slot}.png` (slot = `stem`, `optA`, `optB`, …, `solution`).
- RLS policies on `storage.objects`:
  - Public `SELECT` on this bucket.
  - `INSERT/UPDATE/DELETE` restricted to `admin | super_admin | teacher`.

## 2. Database additions

- `test_questions`: add `image_urls jsonb` (`{ stem: [], optionA: [], optionB: [], optionC: [], optionD: [], solution: [] }`) and `image_url text` (legacy first stem image, for backward compat).
- `question_bank`: same two columns + `import_batch_id uuid`, `source_filename text`.
- New table `question_import_batches` (audit/undo):
  - `target_type` (`test` | `bank`), `target_id` (nullable for bank), `filename`, `uploaded_by`, `question_count`, `image_count`, `status`, `error_log jsonb`.
  - Standard `created_at`. GRANTs to `authenticated` + `service_role`; RLS so only admins/teachers see their own batches; super_admin sees all.

## 3. Parser (client-side, runs in admin browser)

Library: `mammoth` (already lightweight, MIT) + `jszip` to walk `word/media/` for images.

Pipeline:
1. Read `.docx` as ArrayBuffer.
2. `mammoth.convertToHtml({ buffer, convertImage: mammoth.images.imgElement(...) })` — capture each embedded image with a unique placeholder.
3. Walk the HTML in order, splitting on the numeric markers `1`, `2`, `3` … at paragraph start.
4. For each block: extract stem text + inline images, then peel off `(A) … (B) … (C) … (D) …` into option text/images.
5. Locate every answer-key **table** in the doc and merge rows `{ questionNo → answerCell }`.
6. Type detection (your chosen "Both, with auto-detect fallback"):
   - If a heading like `Section B – Numerical` precedes a block → force `numerical`/`integer`.
   - Else if the answer cell is `A|B|C|D` → `mcq-single`.
   - Else if the cell parses as a number → `integer` (whole) or `numerical` (decimal).
   - Mismatches surfaced in the preview step.

## 4. Image handling during import

- For every parsed image: upload bytes directly from the browser to `question-images/{batchId}/...` via the Supabase JS client.
- Get the public URL, place it into the right slot in `image_urls`.
- The first stem image is mirrored to legacy `image_url` so old render code keeps working.
- Progress bar shows `uploaded / total images`.

## 5. Admin UI

### Entry point — "Bulk import" button
Added in two places:
- `AdminQuestionBankPage.tsx` → imports into the **question bank**.
- Inside an existing test on `CreateTestPage.tsx` → imports into **that test** (append at end).

### Upload modal flow
1. **Pick target** (already implied by entry point) + subject/chapter for bank imports.
2. **Drop .docx** → parser runs → progress bar.
3. **Preview & fix** screen:
   - Table of parsed questions: number, detected type, marks (defaults: `+4 / -1`, MCQ-multi `+4 / -2`, numerical `+4 / 0`), correct answer, image previews.
   - Inline edit for any field, delete bad rows, re-pick type.
   - Validation badges (missing answer, image upload failed, mismatched options).
4. **Confirm import** → inserts rows in `test_questions` *or* `question_bank` in one transaction via an RPC; writes the batch row.
5. Toast with link to the new test/bank section. "Undo last import" button uses the batch id.

## 6. Render side (read path)

`TestTakingPage.tsx`, instruction page, and review screen:
- When rendering question stem and each option, also render `image_urls.stem[]`, `image_urls.optionA[]`, … as `<img loading="lazy" />` inside the existing zoom-modal.
- KaTeX/LaTeX rendering (already wired) stays untouched — Word equations come through as MathML/text and are passed through `katex` when wrapped in `$…$`.

## 7. Limits & safety

- Max file size: 25 MB.
- Max questions per file: 300 (configurable).
- Reject non-`.docx` (old `.doc` blocked with friendly message).
- All parsing is client-side — no edge function needed for v1; storage uploads use the existing auth session.

## Technical notes

- New deps: `mammoth` (≈ 600 KB gz), `jszip` (already used elsewhere — reuse if present).
- Reuses existing `submit_test_attempt` RPC; no scoring changes needed because question types are already supported from Phase 3.
- Backward compatible: questions with no `image_urls` render identically to today.
- No changes to existing tests/data.

## Files touched (planned)

**New**
- `src/lib/docxImport/parseDocx.ts` — pure parser (mammoth + answer-key matcher).
- `src/lib/docxImport/uploadImages.ts` — storage upload helper.
- `src/lib/docxImport/types.ts` — `ParsedQuestion` types.
- `src/components/admin/BulkImportDialog.tsx` — upload + preview modal.
- `src/components/admin/QuestionPreviewTable.tsx` — editable preview grid.
- Migration: new bucket policies, new columns, `question_import_batches` table, `bulk_insert_questions` RPC.

**Edited**
- `src/pages/AdminQuestionBankPage.tsx` — "Bulk import .docx" button.
- `src/pages/CreateTestPage.tsx` — same button inside test editor.
- `src/pages/TestTakingPage.tsx` — render `image_urls` slots.
- `src/components/QuestionRenderer.tsx` (or equivalent) — same render extension.

## Out of scope for this phase
- Matrix-match / passage / assertion-reason imports (Phase 3 follow-up).
- Server-side OCR or LaTeX equation re-typesetting.
- Re-evaluation RPC and rank CSV export (Phase 6).
