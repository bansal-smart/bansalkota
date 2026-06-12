## Goal

Seed the **Bansal Review Test-03 (14-06-2026, JEE Main, Class XIII)** as a real, published live test with all 75 questions (Physics + Chemistry + Maths, 20 SCQ + 5 Integer per subject) using the answer key from the second PDF, **and** fix every place where LaTeX / question images don't render in the test-taking + review flow.

---

## Part A — Seed the live test

### Test metadata
- Title: `RT-03 · JEE Main · 14 Jun 2026 (Class XIII)`
- Pattern: `jee-main`, 3 sections (Physics, Chemistry, Maths)
- Duration: 180 min, Total marks: 300
- Marking: SCQ → +4 / −1 / 0 unanswered; Integer → +4 / −1 / 0
- Schedule: live now (starts_at = now − 1 min, ends_at = now + 7 days), `is_published = true`, `auto_release = true`
- Mode: open to all JEE-Main students

### Questions (75 total, answers mapped from PDF-2)

For each subject, Q1–Q20 = `mcq-single` (4 options), Q21–Q25 = `integer` (numerical_answer = answer-key value, tolerance 0).

Answer key applied verbatim from PDF-2:
- **Physics**: D,D,A,B,B,D,A,A,B,B,D,B,B,C,C,C,D,A,B,B,9,2,2,2,100
- **Chemistry**: B,B,B,D,B,B,A,D,B,B,A,C,C,D,A,D,C,A,D,B,48,8,30,8,4
- **Mathematics**: B,A,D,B,B,A,A,B,A,A,D,C,C,A,C,A,D,D,D,C,8,9,60,7,324

### Question text & LaTeX
All stems / options stored as Markdown with KaTeX math (`$…$`, `$$…$$`) and `\ce{}` for chemistry — same pipeline already used by `MathRenderer`. Symbols like vectors (`\vec{AB}`), fractions, super/sub, Greek letters all converted to LaTeX. Atomic-data preamble lives in test `instructions`.

### Diagram questions → image attachments
The following questions have figures the parser couldn't recover as clean SVG. We upload **cropped page snippets** as `question_image_url` into the existing `question-images` bucket (public-read via signed/public URL):

| Subject | Q | What the image shows |
|---|---|---|
| Physics | 2 | v vs t graphs (A–D) |
| Physics | 3 | V² vs S graph |
| Physics | 4 | velocity–displacement curves (A–D) |
| Physics | 6 | projectile trajectory A→B |
| Physics | 22 | x(m) vs t(s) graph |
| Chemistry | 14 | structure for IUPAC naming |
| Chemistry | 20 | Fischer projections (a–d) |
| Chemistry | 24 | bromochlorobutane isomers reference |
| Maths | 4 | Venn diagram for symmetric difference |

Mechanism: `pdftoppm` the source PDF at 220 DPI → `nix run nixpkgs#imagemagick -- convert` to crop the right band per question → upload to `question-images/seed/rt03/<subject>-q<n>.png` → write the public URL into `test_questions.question_image_url`.

### Insertion path
Single SQL migration (idempotent on a fixed UUID for the test row) that:
1. Inserts the `tests` row.
2. Inserts 75 `test_questions` rows (`position` 1–75, `subject`, `question_type`, `question_text`, `options` jsonb, `correct_answer`, `numerical_answer`, `tolerance`, `marks_correct=4`, `marks_wrong=-1`, `marks_unanswered=0`, `question_image_url`).
3. Re-runs cleanly: `ON CONFLICT (id) DO NOTHING` for the test, and a `DELETE … WHERE test_id = <fixed>` before re-inserting questions.

---

## Part B — Render LaTeX + question images everywhere in the test flow

Audit + fix the following surfaces so `question_text`, every option, `explanation`, and `question_image_url` always render:

1. **`TestTakingPage.tsx`** — question stem currently rendered as plain text in places; switch every stem/option/explanation render through `<MathRenderer>` and show `question_image_url` above the options (max-h-72, rounded border, click-to-zoom).
2. **`TestResultPage.tsx`** — per-question review: render stem + each option + correct-answer highlight + explanation through `<MathRenderer>`, and show `question_image_url`.
3. **`TestSubjectBreakdownPage.tsx`** — same treatment for question previews.
4. **`QuestionBankPanel.tsx`** — list rows show a small thumbnail when `question_image_url` is set, and the preview popover renders LaTeX.
5. **`ChapterQuizPage.tsx`** — already uses MathRenderer for stems; add option-level rendering + image support to stay consistent.
6. **CSS** — ensure `katex` styles are imported once globally (already in `main.tsx` via `MathRenderer`), and add `.math-content img { max-width: 100%; }` so embedded chem/diagram images don't overflow on mobile.
7. **Storage policy** — confirm `question-images` bucket has a public-read policy for `SELECT` so students can view diagrams without signed URLs; add policy in the migration if missing.

---

## Verification

1. Re-query DB: `SELECT subject, count(*) FROM test_questions WHERE test_id = '<seed-id>' GROUP BY subject` → expect 25/25/25.
2. Spot-check 6 questions (3 SCQ, 3 integer) against PDF-2 key.
3. Open `/tests` as a student → start the RT-03 attempt → verify:
   - LaTeX renders in Physics Q1 (α, β fractions), Maths Q3 ($\sin/\cos$), Chemistry Q10 ($_{26}Fe^{2+}$).
   - Diagram images appear for Physics Q2/Q3/Q22 and Maths Q4.
4. Submit a partial attempt → confirm score matches expected JEE-Main marking (+4 / −1 / 0).
5. On the result page, verify explanations + images render and the correct option is highlighted.

---

## Technical notes

- Schema already supports everything needed: `test_questions.question_image_url text`, `question_type text`, `correct_answer jsonb`, `numerical_answer numeric`, `tolerance numeric`, `marks_*`.
- `submit_test_attempt` is already JEE-correct after the last migration (SCQ exact match, integer tolerance, MSQ JEE-Adv rules — not used here).
- Migration writes only to `public.tests` + `public.test_questions` + storage policy on `storage.objects` for the `question-images` bucket. No schema changes.
- Diagram crops are produced inside the sandbox during the build step and uploaded via `supabase--storage_upload`; the resulting public URLs are inlined into the SQL migration as literals so the migration is reproducible.

---

## Out of scope (call out before building)
- Re-typesetting the chemistry structural formulas as SMILES/MOL — we ship them as images.
- Adding a calculator / OMR-style UI changes — keeping current CBT interface.
