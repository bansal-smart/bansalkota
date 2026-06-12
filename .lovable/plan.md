## Goal
1. Extract all diagram images from the RT-03 question PDF and attach them to the correct questions in both `tests` (test_questions) and `question_bank`.
2. Upgrade options across the app so each option can render LaTeX/math AND carry an optional image (not just text).

---

## Part 1 — RT-03 image extraction

**Source PDFs:** the RT-03 question paper + answer sheet already uploaded.

**Approach:**
- Render each PDF page at 300 DPI using PyMuPDF.
- For each question position that contains a diagram (identified by visually scanning the rendered pages — Phys Q2/3/4/6/22/39/44/54 already done; Chem Q5 benzene ring, Chem Q17 four-isomer panel; plus any others missed on a fresh pass of all 75 questions), crop the diagram region.
- Upload each crop to the `question-images` bucket under `rt03/qNN.png`, get a signed/public URL.
- Update `test_questions.question_image_url` for the RT-03 test row matching that position.
- Mirror the same `question_image_url` into the corresponding `question_bank` row (matched by `question_text` + `source_filename = 'RT-03'`).

**Verification:** open the test in the UI and confirm each diagram renders next to its question; spot-check the Question Bank entries.

---

## Part 2 — Option-level LaTeX + images

**Current state:** `options` is stored as `jsonb` (array of strings) in both `test_questions` and `question_bank`. The renderer treats each option as plain text wrapped in `<MathRenderer>` for `$...$` segments.

**Schema change (backward compatible):**
Allow each option to be either a string (legacy) OR an object:
```json
{ "text": "string with $latex$", "image_url": "https://..." | null }
```
No SQL migration needed — `jsonb` already supports this. Reader code normalizes on load.

**Code changes:**
1. **`CreateTestPage.tsx`** (test editor):
   - Change option input row: keep the text field (already supports LaTeX via MathRenderer preview), add a small "Add image" button per option (same uploader as the question image, stored under `question-images/options/...`).
   - Show thumbnail + replace/remove controls when an option has an image.
   - On save, write options as `[{text, image_url}, ...]`.

2. **Question Bank editor** (`AdminQuestionBankPage` or wherever options are edited) — same per-option image uploader.

3. **Bulk .docx importer** — already pulls option text; extend to detect inline images near option letters and attach to the option object.

4. **Renderers** (test-taking page, review page, admin preview, question bank list):
   - Add a `normalizeOption(opt)` helper returning `{text, image_url}`.
   - Render `<MathRenderer value={text}/>` and, if `image_url`, an `<img>` below it.

5. **Grading (`submit_test_attempt` RPC):** unchanged — `correct_answer` still references option index/letter, not content.

**Files to touch:**
- `src/pages/CreateTestPage.tsx`
- `src/pages/AdminTestDetailPage.tsx`
- `src/pages/TestTakingPage.tsx` (or equivalent)
- `src/pages/TestReviewPage.tsx`
- `src/pages/AdminQuestionBankPage.tsx` (editor + list)
- `src/lib/options.ts` (new — `normalizeOption` helper + TS types)
- `src/components/MathRenderer.tsx` (no change expected)

---

## Order of execution
1. Build `normalizeOption` helper + types.
2. Update all renderers to use it (safe — backward compatible with string options).
3. Update editors (CreateTest + Question Bank) with per-option image upload.
4. Run RT-03 extraction script and patch DB.
5. Visually verify in preview.

## Open question
Should the `.docx` importer auto-attach images that appear inline next to options (A./B./C./D.), or should that stay a manual step in the editor for now?
