## Problem

In `src/pages/AdminTestResultPage.tsx`, the student detail PDF (`downloadStudentPDF`) re-evaluates each question on the client with broken logic:

- Integer questions: compares user string `"0004"` against stored `{value: 4}` via `JSON.stringify` → always "Wrong" even when student answered correctly. This explains positions 8, 9, 10, 11, 24, 25, 26, 27 being shown wrong.
- mcq-multi: only checks exact equality / `.includes`, never awards partial marks. This explains positions 5, 21, 36, 37, 38, 39 missing their partial marks.
- Q# in the PDF and drawer table shows the raw 0-indexed `position`, so every question is off by one.

The database `submit_test_attempt` RPC already scores everything correctly — `test_attempts.metadata.questions` contains the authoritative per-question `marks`, `is_correct`, `attempted`, `selected`, `correct`. I verified Saanvi's metadata: positions 8/9/10/11/24/25/26/27 are all `is_correct=true, marks=4`, position 5 has `marks=2`, position 36 has `marks=1`, etc. All matches the user's expectation.

This is a pure presentation bug. No scoring/RPC change needed.

## Fix

Edit only `src/pages/AdminTestResultPage.tsx` (no backend changes).

### 1. Use authoritative metadata in the PDF

Rewrite the row builder in `downloadStudentPDF` so that, for each question, it reads from `att.metadata.questions` (matched by `question_id`) instead of recomputing:

- `Status`: `Not Attempted` (gray) when `!attempted`; `Correct` (green) when `is_correct`; `Partially Correct` (amber) when `attempted && !is_correct && marks > 0`; `Wrong` (red) otherwise.
- New `Marks` column showing the per-question `marks` (`+N`, `-N`, or `0`) with green/red/gray colour, mirroring the on-screen drawer.
- `Your Answer` / `Correct Answer` formatting upgraded to handle:
  - integer/numerical answers stored as `{value: N}` or strings like `"0004"` → render the numeric value.
  - mcq-multi arrays → render as `A, C` letter labels (sorted).
  - mcq-single number → `A. <option text>`.

### 2. 1-indexed question numbers

- In the PDF rows: render `String(q.position + 1)` instead of `String(q.position)`.
- In the on-screen drawer table (the `Q#` cell at line 1003): render `q.position + 1`.

### 3. PDF header tweak

Update the per-student PDF page heading/labels to use 1-indexed numbering everywhere it appears (column header label stays `Q#`, but values are 1-indexed).

### Out of scope

- No changes to `submit_test_attempt` or any other SQL.
- No changes to the partial-marking rule — the client has confirmed JEE Advanced "+1 per correctly chosen option, capped" is the desired rule, which already matches the implementation.
- No changes to other pages (`TestResultPage`, `TestResponseSheetPage`) unless they re-surface the same bug; out of scope for this task.

## Verification

After the edit, regenerate Saanvi's PDF and confirm:
- Q# column reads 1..48.
- Positions 9, 10, 11, 12 (paper) and 25, 26, 27, 28 (paper) show `Correct` with `+4`.
- Positions 6 (paper Q.6), 22 (Q.22), 37 (Q.37), 38, 39, 40 show `Partially Correct` with `+2`, `+1`, `+1`, `+2`, `+3`, `+1` respectively — matching the DB metadata and the user's table.
- Total stays 75 / 180 (unchanged, since DB scoring was already right).
