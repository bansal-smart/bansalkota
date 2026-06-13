## Goal

One Word file format for bulk-importing every kind of question used at Bansal — Single Correct, Multiple Correct, Integer, and Match-the-Following — with LaTeX math, Word equations, and inline images supported in the stem **and** each option. Upload happens from **Admin → Question Bank → Bulk Upload**, with an optional "Also push to test…" picker.

## The canonical Arke format (single spec)

The parser will accept both inputs you sent, treated as the same format:

- **Preferred**: Word paragraph styles — `Q-Number`, `Q-Stem`, `Q-Option`, `Q-Answer`, `Q-Solution`, `Q-Topic`. (Recommended for authors; zero ambiguity.)
- **Fallback**: plain text patterns used in the chemistry sample — `1.` for number, `(1)(2)(3)(4)` for options, `Answer: …`, `Topic: …`, `Solution:` (or italic paragraph after Answer).

Both produce the same internal record. The parser auto-detects which mode the doc is in.

**Math**: `$…$` inline, `$$…$$` display, **and** native Word equations (OMML) — OMML is auto-converted to LaTeX via the `omml2latex` library so authors can use Alt+= freely.

**Images**: any image bytes embedded inline are attached to the slot they appear in — stem, option 1/2/3/4, or solution — based on their position relative to the option markers. Each image is uploaded to the `question-images` bucket and stored as a public URL.

**Question type detection** from the `Answer:` line:

| Answer pattern | Type |
|---|---|
| `(3)` or `Answer: 3` | mcq-single |
| `(1), (2), (4)` | mcq-multi |
| Plain integer `9` (no parentheses) under SECTION III | integer |
| `A-Q, B-S, C-P, D-R` | **match-following** (new) |

**Match-the-following table** (after the stem) is parsed from any 2-column table whose header row reads "Column A" / "Column B". Rows of the form `(A) item` / `(P) item` populate the two columns.

## New question type: `match-following`

Stored alongside existing MCQ types. Schema additions (single migration):

- `test_questions.question_type` and `question_bank.question_type` already exist as text — just start writing `'match-following'`.
- Use existing `options` jsonb to store **Column B** items (label + optional `image_url`).
- New jsonb column `match_left` on both tables = Column A items `[{key:'A', text, image_url?}, …]`.
- `correct_answer` jsonb already nullable — store the mapping `{"A":"Q","B":"S","C":"P","D":"R"}`.

Scoring (added to `submit_test_attempt` function): full marks if every pair matches; partial marking optional (1 mark per correct pair, capped). Wrong-mark applied only when at least one pair is filled and the set is not fully correct (matches NTA convention).

Test UI: in `TestTakingPage`, render a two-column layout. Left column shows A/B/C/D anchors; right column is a dropdown per row listing P/Q/R/S labels (with thumbnails when an image is present). State saved into the same `answers` jsonb as `{ selected: { A: 'Q', ... } }`.

Review UI: render the user's pairs with green/red ticks against the correct mapping.

## Parser rewrite (`src/lib/docxImport/parseDocx.ts`)

Replaces the current pragmatic parser. New pipeline:

```text
.docx → mammoth (HTML + images as data URIs + style names preserved)
      → DOM walk
         ├─ detect style-based mode vs pattern-based mode
         ├─ group blocks into questions on Q-Number / "^\d+\."
         ├─ inside each question: slot = stem → options[1..4] → answer → solution
         ├─ OMML → LaTeX (omml2latex) before stripping
         ├─ images: assign to current slot, collect bytes
         ├─ tables in stem → Match-the-Following columns
         └─ Topic line → topic field
      → ParsedQuestion[]
```

Mammoth needs a `styleMap` so it preserves our custom styles as data attributes:

```
p[style-name='Q-Number'] => p.q-number
p[style-name='Q-Stem']   => p.q-stem
...
```

`ParsedQuestion` extends the existing type with `topic`, `solution`, `matchLeft?`, plus `optionImages: (string|null)[]`.

## Importer dialog (`DocxBulkImportDialog.tsx` + `BulkQuestionUploadDialog.tsx`)

- Single dialog opened from **Admin → Question Bank** (button already exists) and from each test's detail page.
- Step 1: file drop, parse, show summary chip per question — type, topic, # images.
- Step 2: preview list using `MathRenderer` so LaTeX is visible exactly as students will see it; each question expandable to verify options and the answer key.
- Step 3: **Target** — radio: `Question Bank only` / `Question Bank + add to test:` with a searchable test picker. (Always writes to bank for reuse; optionally inserts copies into `test_questions` with auto-incremented `position` after the test's current max.)
- Step 4: commit — uploads all images first (parallel, 4 at a time), then inserts questions in one batched call, then creates a `question_import_batches` row with the file name, counts, and any per-question warnings.
- Each option's image slot also exposes a small "Replace image" control in the preview, so authors can fix slots that landed on the wrong option without re-uploading the doc.

## Renderers (read-only changes)

- `MathRenderer` already handles `$…$` and `$$…$$` — no change.
- `TestTakingPage`, `TestSubjectBreakdownPage`, `QuestionEditorDialog`, `QuestionBankPanel`: add a `MatchFollowing` sub-component and route to it when `question_type === 'match-following'`. Existing per-option image rendering stays.

## Files to add / edit

**New**
- `src/lib/docxImport/parseDocx.v2.ts` — the rewritten parser (kept side-by-side until verified, then `parseDocx.ts` re-exports from v2).
- `src/lib/docxImport/ommlToLatex.ts` — wrapper around the `omml2latex` npm package.
- `src/components/test/MatchFollowing.tsx` — taker + review renderer.

**Edited**
- `src/components/DocxBulkImportDialog.tsx` — new preview UI, target picker, image-slot fix-up.
- `src/components/BulkQuestionUploadDialog.tsx` — same parser, same UI shell.
- `src/pages/TestTakingPage.tsx`, `src/pages/TestSubjectBreakdownPage.tsx` — branch on `match-following`.
- `src/components/QuestionEditorDialog.tsx`, `src/components/QuestionBankPanel.tsx` — editor for Column A items + correct-pair map.
- Supabase migration: add `match_left jsonb` to `test_questions` and `question_bank`; extend `submit_test_attempt` with the match-following scoring branch.

## What stays the same

- Storage bucket (`question-images`), `question_import_batches` audit trail, undo-import flow, existing single-question editor, NTA marking for the other three types.

## Out of scope

- Drag-and-drop UI for Match (will use dropdowns — fast, mobile-friendly, equally fair).
- AI-assisted topic tagging.
- Excel / Google Doc import.

## Open clarification logged

For option images, you said the URL will be inside the Word file or uploaded individually per question. The importer will:

1. Use the embedded image when one is present in that option's paragraph.
2. If the option text contains a bare URL ending in `.png/.jpg/.jpeg/.webp/.gif`, treat that URL as the option's image and strip it from the visible text.
3. Otherwise leave the slot empty — the author can attach an image inline in the preview step or later in the question editor.