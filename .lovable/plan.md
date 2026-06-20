## Goal

In `DocxCommonImportDialog` (the "Common method — cropped .docx import" preview shown), add a **Marks tagging by question range** section right under the existing **Subject tagging by question range** block. Admin defines ranges like `Q1–Q14 → +4 / −1`, and every imported question in that range uses those marks unless overridden in the per-question card.

## UX

New panel below the subject-range panel, same visual treatment:

```text
Marks tagging by question range
e.g. Q1–20 +4/−1, Q21–40 +3/−1. Optional — falls back to type defaults.
                                            [Auto-split equally] [+ Add range]

Q [ 1 ] to Q [ 14 ]  →  +[ 4 ]  / −[ 1 ]   [🗑]
Q [15 ] to Q [ 30 ]  →  +[ 3 ]  / −[ 1 ]   [🗑]
```

Rules:
- Range = `{ from, to, marksCorrect, marksWrong }`. `marksUnanswered` stays 0, `partial_marking` stays driven by question type.
- Inputs are integer-step (consistent with the recent CreateTestPage fix).
- "Auto-split equally" seeds one range covering all parsed questions using the type-default marks of Q1, so admin can tweak.
- "+ Add range" appends the next 10-question slot using the previous range's marks.
- Ranges may overlap; **last matching range wins** (same precedence as subject ranges, lines 105–108).
- Unlike subject ranges, marks ranges are **optional**. Uncovered questions silently use `DEFAULT_MARKS[q.type]` (current behavior). No validation error.

Per-question card (line ~756) keeps showing the resolved marks (`marksForNumber(n).c / .w`) instead of always `DEFAULT_MARKS[q.type]`, so the admin sees the effect of their range. Editing marks inline on a question (already supported via `updateQ`) continues to override the range.

## Resolution order (per question, at import time)

1. Explicit per-question override (`q.marksCorrect` / `q.marksWrong` if set via inline edit) — highest.
2. Matching marks range (last match wins).
3. `DEFAULT_MARKS[q.type]` — fallback.

Apply this both in the `test_questions` insert path (around line 407) and the `question_bank` insert path (around line 440).

## Technical changes (single file: `src/components/DocxCommonImportDialog.tsx`)

1. New type + state:
   ```ts
   type MarksRange = { from: number; to: number; marksCorrect: number; marksWrong: number };
   const [marksRanges, setMarksRanges] = useState<MarksRange[]>([]);
   ```
2. New helper `marksForNumber(n, type)` mirroring `subjectForNumber`, iterating `marksRanges` from the end and falling back to `DEFAULT_MARKS[type]`.
3. Render the new panel directly after the subject-range panel (after line ~727), reusing the same Tailwind classes for visual parity. Use `step="1"` and `type="number"` on the marks inputs.
4. Auto-split handler seeds `[{ from: minN, to: maxN, marksCorrect: DEFAULT_MARKS["mcq-single"].c, marksWrong: DEFAULT_MARKS["mcq-single"].w }]`. "+ Add range" mirrors the subject "+ Add range" handler.
5. In both insert builders (lines ~407 and ~440), replace
   ```ts
   const marks = DEFAULT_MARKS[q.type];
   ```
   with
   ```ts
   const base = DEFAULT_MARKS[q.type];
   const ranged = marksForNumber(q.number, q.type);
   const marks = {
     c: q.marksCorrect ?? ranged.c,
     w: q.marksWrong  ?? ranged.w,
     u: base.u,
     partial: base.partial,
   };
   ```
   (`q.marksCorrect` / `q.marksWrong` only exist if the per-question inline editor sets them; if those fields aren't currently on the parsed-question type, gate on `(q as any).marksCorrect`.)
6. Update the per-question card label (line 756) to show `marksForNumber(q.number, q.type).c / .w` instead of `DEFAULT_MARKS[q.type].c / .w`.

No DB schema, RPC, or backend changes — `test_questions.marks_correct / marks_wrong` already accept these values.

## Out of scope

- `DocxBulkImportDialog` (the older bulk variant). Tell me if you want the same panel added there.
- Changing default marks values or partial-marking semantics.
- Marks ranges for `marks_unanswered` (kept at 0).

## Verification

Re-import the same 54-question Bansal `.docx`:
- Add range `Q1–14 +4/−1`, `Q15–30 +3/−1`, leave 31–54 untagged.
- Inspect rows 1, 14, 15, 30, 31 in the preview cards — labels reflect the range.
- After "Import 54 questions", spot-check `test_questions.marks_correct/marks_wrong` for those rows.
- Override Q5 inline to `+2/0`; confirm the override persists over the range.

## One open question (won't block the plan)

Do you also want this on the legacy `DocxBulkImportDialog`, or only on the Common-method dialog shown in the screenshot?
