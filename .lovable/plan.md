## Goal

Make the **Master Import** button on the test creation page parse the actual `Master File for JEE Advanced & JEE Main.docx` format (and any paper that follows the same conventions) with 100% question coverage — every section type, equations, embedded images, and answer notations. The existing strict "Topic: / Type: / Answer:" template stays supported; we add a second "exam-paper" mode and auto-route between them.

## What the uploaded file actually contains

Section headers in brackets, e.g.:

```text
[True and False TYPE]
[SINGLE CORRECT CHOICE TYPE]
[REASONING TYPE] / (SINGLE CORRECT CHOICE TYPE)
PARAGRAPH TYPE  →  PARAGRAPH "X"  →  Q.N ...
[MULTIPLE CORRECT CHOICE TYPE]
Integer answer Type / Numerical answer Type  (Ans. 18 / Ans. [25000] / Ans. (04.25))
[MATCHING TYPE PARAGRAPH] / [MATCHING LIST TYPE]
MATCH THE COLUMN  (multi-row answer like "Ans. (A) q (B) p, r (C) p, s (D) q, s")
```

Per-question markers used:

- Numbering: `Q.1`, `Q. 35`, `Q.16` (number after `Q`, optional space).
- Options: `(A)` / `(B)` / `(C)` / `(D)` on their own lines OR inline.
- Answer: `Ans. (A)`, `Ans. (A, C)`, `Ans. (A, B, C, D)`, `Ans. 18`, `Ans. [25000]`, `Ans. (04.25)`, `Ans. (A) q (B) p, r (C) p, s (D) q, s`.
- Solution: `Sol.` (not `Solution:`) followed by paragraphs / display LaTeX / images until next `Q.` or section.
- LaTeX: `$...$` inline, `$$...$$` display, also Word OMML equations (mammoth already passes them through).
- Images: pasted inline anywhere (stem / option / solution / match cell).

## Changes

### 1. `src/lib/docxImport/parseDocx.ts` — new "exam-paper" parser path

Add a second pass detector + parser, kept inside the same `parseDocxQuestions` entry point so the existing template still works:

1. **Section header detection** — expand `sectionType()` to match bracketed headers:
   - `True and False` → new type `true-false` (mcq-single with locked options `True` / `False`).
   - `Single Correct Choice` → `mcq-single`.
   - `Multiple Correct Choice` → `mcq-multi`.
   - `Reasoning` / `Statement` / `Assertion` → `mcq-single` (standard A/B/C/D explanation options).
   - `Paragraph` / `Comprehension` → `mcq-single` by default, but track a shared `passage` stem (the text between the section header and the first `Q.N`) and prepend it to every question's stem in that paragraph block.
   - `Integer answer` → `integer`.
   - `Numerical answer` / `Decimal` → `numerical`.
   - `Matching List` / `Match the Column` / `Matching Type` → new type `match-column` (see §3).

2. **Question number regex** — accept `Q\.?\s*(\d+)` in addition to `1.` / `1)`.

3. **Answer line parser** — extend `parseAnswer()`:
   - Strip leading `Ans` / `Ans.` (already handled by `extractAnswerLine`, just confirm `\.` allowed after the keyword).
   - Strip wrapping `(...)` and `[...]` from the value before classification.
   - `(A, C)` / `A,B,C,D` → multi.
   - Bare integer like `18`, `25000` → integer.
   - Decimal like `04.25`, `3.10-3.18` → numerical (existing range logic already handles `-` / `–`).
   - **Match-column pattern** `(A) q (B) p, r (C) p, s (D) q, s` → new branch returning `type: "match-column"`, `correctMap = { A:["q"], B:["p","r"], C:["p","s"], D:["q","s"] }` (values are lower-case row keys → array because multi-select per row is required by JEE matching).

4. **Solution marker** — accept `Sol.` / `Sol:` / `Sol —` in addition to `Solution:`. Capture everything until the next `Q.N` / section header / next `Topic:` (same buffer model as today; just widen `trySolution` regex).

5. **True/False** — when section type is `true-false` and no `(A)/(B)` options were found, synthesize two options `True` and `False` in `flushBuffer`. Answer `(A)` maps to True, `(B)` to False.

6. **Paragraph passages** — buffer the passage text under a `currentPassage` variable while inside a `[PARAGRAPH …]` section; on each `flushBuffer` for that section, prepend `<div class="passage">…</div>` to the stem. Reset `currentPassage` when a new section header arrives.

7. **Match-the-column tables** — these papers use a 2-column or multi-column Word table without the `Column A | Column B` header. Detect by section header (`MATCH THE COLUMN` / `MATCHING LIST` already set `currentSection`) and treat the table as the match content. First column = left key (A, B, C, D), remaining columns = right items (P/Q/R/S or 1/2/3/4). Reuse the existing `parseMatchTable()` but loosen the header check when we're inside a matching-section.

### 2. New `ParsedQuestionType` values

Extend the union in `parseDocx.ts`:

```ts
export type ParsedQuestionType =
  | "mcq-single"
  | "mcq-multi"
  | "integer"
  | "numerical"
  | "match-following"   // existing 1-to-1 mapping
  | "match-column"      // new: many-to-many mapping
  | "true-false";       // new: locked True/False MCQ
```

Wire those new values through:

- `src/components/DocxBulkImportDialog.tsx` (preview rendering + payload).
- `src/lib/docxImport/uploadImages.ts` (`question_type` mapping written into `test_questions` / `question_bank`).
- `src/components/QuestionEditorDialog.tsx` (display labels) — minimal: render `match-column` like `match-following` but allow multi-pick per row; render `true-false` as a 2-option MCQ.

If extending the DB enum is risky, store `match-column` as `mcq-multi` with `match_map` JSON on the row instead, and `true-false` as `mcq-single`. **Decision in implementation step 3 below.**

### 3. DB strategy for the two new types

Inspect `test_questions.question_type` / `question_bank.question_type` enums via `supabase--read_query`. Two paths:

- **Preferred**: add `match-column` and `true-false` to the enum via a migration (`ALTER TYPE … ADD VALUE`) so we keep semantic accuracy and dedicated UI.
- **Fallback (no migration)**: persist `match-column` as `match-following` (lossy when answers are multi-pick — log a warning) and `true-false` as `mcq-single` with synthesized True/False options. Pick this if migration is undesirable.

The plan defaults to the migration path; if the user prefers no schema change, we'll switch to fallback during build.

### 4. `src/components/MasterImportInstructions.tsx`

Append a second section "Exam-paper format (also supported)" documenting the new auto-detected layout: section bracket headers, `Q.N`, `Ans.`, `Sol.`, paragraph passages, match-column tables. Keep the existing strict-template docs above it.

### 5. Validation pass

Add a Vitest fixture under `src/lib/docxImport/__tests__/` that loads a trimmed copy of the uploaded Master file and asserts:

- Total question count is non-zero.
- At least one of each section type appears (`true-false`, `mcq-single`, `mcq-multi`, `integer`, `numerical`, `match-column`).
- No question has `correctAnswer == null && correctMap == null`.
- Images get attached to the right slot (spot-check the first stem image and the FBD solution image from Q.1).

### 6. No changes to

- `src/lib/docxImport/parseCommonDocx.ts` (Common import stays as-is).
- `CreateTestPage.tsx` wiring (still calls `openDocxImport("master")` → `DocxBulkImportDialog`).
- `parseCommonDocx` flow.

## Open questions before build

1. **DB enum** — okay to add `match-column` and `true-false` to the `question_type` enum, or should we fall back to `match-following` + `mcq-single` and avoid a migration?
2. **Paragraph passages** — render the shared passage on every question card (prepended block), or render it once as a collapsible context above the group? (The card-prepend route is simpler and matches how JEE PDFs read.)
3. **True/False answer in source uses `(A)` for True and `(B)` for False** — confirm that's the convention you want us to lock in, since the uploaded file shows `(A) True / (B) False`.

Once those three are answered I'll implement the parser + UI + docs + test.
