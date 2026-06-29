## Goal

Make the Master Import handle the uploaded `Master_File_for_JEE_Advanced_JEE_Main.docx` end-to-end:
1. Render LaTeX equations in the import preview (they're currently dropped).
2. Use the bracketed section headers as the source of truth for question type, options count, and structure.
3. Show parsed math live inside the import modal cards.

## Why equations are missing today

The file uses Word's native OMML equations (`<m:oMath>`). `mammoth.convertToHtml` strips OMML entirely, so the HTML the parser sees has gaps where every equation used to be — which is why those questions look "blank" in the preview.

Lucky shortcut: in this file the OMML `<m:t>` text nodes already hold raw LaTeX source (`\sqrt`, `\frac`, `\left(`, `_0`, etc.). Concatenating each `<m:oMath>`'s `<m:t>` content and wrapping it in `$…$` yields a valid LaTeX string that `MathRenderer` (KaTeX) can already render.

## Changes

### 1. `src/lib/docxImport/parseDocx.ts` — pre-process docx XML before mammoth

Add a JSZip step that runs *before* `mammoth.convertToHtml`:

- Unzip the uploaded `.docx`, read `word/document.xml`.
- For each `<m:oMathPara>…</m:oMathPara>` (display) and `<m:oMath>…</m:oMath>` (inline):
  - Concatenate inner `<m:t>…</m:t>` text in document order.
  - Normalize: collapse whitespace, fix common OMML→LaTeX glitches (`\\sqrt` → `\sqrt`, ensure space after `\frac` etc., balance `{}` if obviously unbalanced — best-effort).
  - Replace the whole `<m:oMathPara>` / `<m:oMath>` element with a plain `<w:r><w:t xml:space="preserve"> $$LATEX$$ </w:t></w:r>` (display) or `<w:r><w:t xml:space="preserve"> $LATEX$ </w:t></w:r>` (inline).
- Re-zip and pass the patched ArrayBuffer to mammoth.

Fallback: if JSZip fails (corrupt zip), skip the rewrite and parse the original buffer — same behaviour as today.

Dependency: `jszip` (already used elsewhere in the project; if not present we'll add it via `bun add jszip`).

### 2. `MathRenderer` — already handles `$…$` and `$$…$$`

No change needed. The dialog already renders option/stem HTML through `MathRenderer`, so the injected LaTeX will appear correctly the moment the parser stops dropping it.

### 3. `parseDocx.ts` — section-header aware routing

Extend the existing `sectionType` / header-detection state machine. Each header sets a typed `currentSection` that controls the rest of the block until the next header:

| Header text (case-insensitive)                                            | Type             | Options                                                                                                                |
|---------------------------------------------------------------------------|------------------|------------------------------------------------------------------------------------------------------------------------|
| `[True and False TYPE]`                                                   | `mcq-single`     | synthesize 2 options "True" / "False"                                                                                  |
| `[SINGLE CORRECT CHOICE TYPE]`                                            | `mcq-single`     | require 4 (A–D)                                                                                                        |
| `[MULTIPLE CORRECT CHOICE TYPE]`                                          | `mcq-multi`      | require 4 (A–D)                                                                                                        |
| `[REASONING TYPE]` followed by `(SINGLE CORRECT CHOICE TYPE)`             | `mcq-single`     | the 4 standard JEE Statement-1/Statement-2 options are captured once at section level and **auto-attached** to every question in that section that has no own options |
| `[PARAGRAPH TYPE]` + `(SINGLE CORRECT CHOICE TYPE)`                       | `mcq-single`     | passage prepended to each question stem (already supported, will be verified)                                          |
| `[PARAGRAPH TYPE]` + `(NUMERICAL VALUE TYPE ANSWER)`                      | `numerical`      | passage prepended; no options                                                                                          |
| `[STEM TYPE (NUMERICAL VALUE TYPE ANSWER)]`                               | `numerical`      | no options                                                                                                             |
| `SINGLE DIGIT INTEGER` / `NON-NEGATIVE INTEGER TYPE` / `[INTEGER…]`       | `integer`        | no options                                                                                                             |
| `[Numerical Value]`                                                       | `numerical`      | no options                                                                                                             |
| `[MATCHING LIST TYPE]`                                                    | `mcq-single`     | 4 options (each option is itself a list like "P→2, Q→3, R→1, S→4") — treat the question as plain SCQ                  |
| `[MATCHING TYPE PARAGRAPH]` / `MATCH THE COLUMN`                          | `match-following`| read the 2-column / multi-row table inside the section                                                                 |

Implementation notes:
- Replace `sectionType` regex chain with an explicit, ordered match (most specific first) and remember the **secondary** header on the following paragraph (`(SINGLE CORRECT CHOICE TYPE)` / `(NUMERICAL VALUE TYPE ANSWER)`) when the primary is `[PARAGRAPH TYPE]` or `[REASONING TYPE]`.
- Add a `sectionStandardOptions: { key, html }[] | null` slot on the buffer. Reasoning sections fill it once when the parser sees the 4 `STATEMENT-1 … STATEMENT-2 …` options at section level; `flushBuffer` falls back to those options when a Reasoning-section question has none.
- For True/False: continue synthesizing exactly 2 options. Enforce 2-option output even if the source accidentally has stray `(A)` / `(B)` lines beyond the True/False text.
- For Single Correct / Multiple Correct: clamp options to the first 4 and emit a warning if fewer than 4 are detected.
- For Matching List: do **not** treat the answer as match-mapping; leave as SCQ so the 4 list-style options remain visible.
- Drop "instruction bullets" (e.g. `•This section contains FOUR (04) questions.`, `Full Marks : +3 …`) — paragraphs that start with `•`, `·`, or `Full Marks` should not be appended to the stem/passage.
- Question-number regex: keep current `Q.1` / `Q. 35` / `1.` support and additionally accept `Q.1Check if …` (no space between number and stem) by widening `NUM_RE` to `/^\s*(?:q\s*\.?\s*)?(\d{1,3})\s*[.)]?\s*(.*)$/i` — already in place; verify it handles the no-space case by trimming leading whitespace only.

### 4. `DocxBulkImportDialog.tsx` — visible math + sanity

- No structural change needed; it already routes option text and stem through `MathRenderer`. Verify the "Solution" preview block also uses `MathRenderer` (add it if currently rendered as raw HTML).
- Add a small per-card badge showing the detected section type (helps the user confirm routing): `True/False`, `SCQ`, `MCQ`, `Reasoning`, `Paragraph SCQ`, `Numerical`, `Integer`, `Matching List`, `Match Column`.

### 5. `MasterImportInstructions.tsx`

Append a "Section headers recognized" table that lists every bracket header above with its resulting type and option count, plus a one-liner: *"Word equations are converted to LaTeX automatically — no extra steps."*

### 6. Validation

After the build, run the current `parseDocxQuestions` against the uploaded master file in a Node-side smoke check:
- Confirm `questions.length >= 50`.
- Confirm at least one True/False (2 options), one SCQ (4 options), one MCQ-multi, one Reasoning, one Paragraph, one Numerical, one Integer, one Matching List, one Match-Column.
- Confirm `stemHtml` for at least 10 questions contains `$…$` (proves LaTeX was preserved).

## Open question

The Reasoning section's 4 fixed options (`(A) STATEMENT-1 is True…` etc.) appear once at the top of the section, before any `Q.N`. Confirm this is your intended convention so the parser can clone them into every Reasoning question — otherwise the answer letter on each Q would refer to options that aren't visible in the per-question card. Reply "yes, clone them" or paste the alternative convention.
