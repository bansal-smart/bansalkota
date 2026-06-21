## Goal

Make the Word bulk importer parse the user's "Arke Question Paper Template" exactly. Today it pulls the title/heading in as Q1 and leaks Q1's stem into the next question. We will lock down the format, fix the leaks, add range answers, and ship a matching `.docx`.

## Spec (the "Arke" stem format)

A Word document is a sequence of **question blocks**. Anything outside a block (title, intro text, "Add your questions below" footer) is ignored.

A block starts at a `Q-Number` paragraph ("1.", "2.", …) and ends at the next `Q-Number` or end-of-document.

Recognized lines inside a block (case-insensitive prefixes, in any order before the answer):

| Element       | Trigger                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| Topic         | `Topic: …` paragraph **above** the number, or a `SECTION …` heading above the number |
| Number        | Standalone `N.` (or `N)` ) paragraph                                             |
| Stem          | All paragraphs after the number until the first option / table / Answer          |
| Options       | Paragraphs starting with `(1)`, `(2)`, `(3)`, `(4)` (or `(A)…(D)`)               |
| Match table   | 2-column table whose header row contains "Column A" / "Column B"                 |
| Answer        | `Answer: …` paragraph (single line, required)                                    |
| Solution      | One or more paragraphs each prefixed with `Solution:` (only these are captured)  |

### Question type resolution

1. If the most recent `SECTION …` heading above this block names a type (Single Correct, Multiple Correct, Integer, Numerical, Match the Following), that wins.
2. Otherwise auto-detect from the Answer line:
   - `(3)` → single
   - `(1),(3)` / `(1), (2), (4)` → multi
   - `5` or `5.25` → numeric (integer if no decimal)
   - `5-9` or `5 to 9` → numeric **range** (min/max)
   - `A-Q, B-S, C-P, D-R` → match-following

`integer` and `numerical` are merged into a single `numeric` type that carries `{ value }` for an exact answer or `{ min, max }` for a range. Existing DB columns `answer_range_min` / `answer_range_max` are already in place — we just populate them.

### Equations & images

- LaTeX is preserved verbatim (`$…$`, `$$…$$`). Word's native equations are converted by mammoth to OMML→MathML, which we'll convert to LaTeX with a tiny shim so they survive too.
- Inline images keep their per-slot routing (stem / optionA-D / matchA-D / matchP-S / solution) — already working.

## Implementation

### 1. `src/lib/docxImport/parseDocx.ts` — rewrite block boundaries

- Discard every paragraph **before** the first `Q-Number` line (kills the heading-as-Q1 bug).
- Treat a `Q-Number` as a hard reset: flush the previous block, start a fresh one. This fixes the Q1-stem-leaking-into-Q4 bug.
- Track the current `SECTION …` heading; map "Single Correct" → `mcq-single`, "Multiple Correct" → `mcq-multi`, "Integer"/"Numerical" → `numeric`, "Match the Following" → `match-following`.
- Add `parseAnswerLine()` that returns `{type, correctAnswer, correctMap, range?}` and, for numerics, recognizes `N`, `N.M`, `N-M`, `N to M` (returns `{min, max}` when both ends present).
- Only paragraphs starting with `Solution:` (case-insensitive) accumulate into `solutionHtml`. Everything else after Answer is ignored until next Topic/Number.

### 2. `src/lib/docxImport/parseDocx.ts` — type model

- Add `numeric` to `ParsedQuestionType` (keep `integer` / `numerical` as aliases for backwards compatibility from old uploads).
- `correctAnswer` for numeric becomes `{ value: number } | { min: number; max: number }`.

### 3. `src/components/DocxBulkImportDialog.tsx`

- Preview: show range as `Min – Max` when present; single value unchanged.
- Save path: when range, write `answer_format='range'`, `answer_range_min/max`, leave `correct_answer` null; when single, keep current behavior.
- Drop the dropdown entry for "Numerical"; rename to "Numeric (value or range)".

### 4. `parseCommonDocxQuestions` (the "Master method") — unchanged scope

The user's template is the bulk format, not the 3-column table format. Master-method dialog stays as-is.

### 5. Sample `.docx`

Regenerate `bansal-arke-sample-10q.docx` using the exact template style — section headings + Topic + numbered block + options + `Answer:` + `Solution:` — with 10 questions covering:

- 3 × Single Correct (with LaTeX)
- 2 × Multiple Correct
- 2 × Numeric exact (one integer, one decimal)
- 1 × Numeric range (`Answer: 9.6 - 10.2`)
- 2 × Match the Following

Verify by feeding it through the parser locally (jsdom + mammoth) before delivering — expect 10 questions, 0 warnings.

## Out of scope

- No DB migrations (range columns already exist).
- No student-side changes (already renders LaTeX & ranges).
- No changes to image upload pipeline.

## Verification

- Round-trip the new sample through the parser: assert 10 questions, types `[single, single, single, multi, multi, numeric, numeric, numeric, match, match]`, no warnings, and Q4 stem does NOT contain Q1 wording.
- Upload to admin → Bulk Word import → preview should show all 10 cleanly, "Import 10 questions" button.
