## What I found

- The uploaded PDF summary totals are internally consistent: Physics 8 + Chemistry 3 + Mathematics 2 = Total 13.
- The “wrong wrong only” issue is a display bug in the admin student detail table: it checks `answer.isCorrect`, but that field is never stored in the attempt answers, so every attempted question can appear as Wrong even when the backend counted it as Correct.
- The score 13 is happening because some integer/numerical questions in this test have `marks_wrong = 0`. With your required rule, every attempted wrong answer should be `-1`, not `0`.
- For roll no. 261057, the backend data currently shows 5 correct answers. Under your rule `+4 correct, -1 wrong, 0 unattempted`, that attempt should be recalculated using the real attempted/wrong count, not the old numeric-question `0` penalty.

## Fix plan

1. **Apply the exact scoring rule everywhere**
   - Correct attempted answer: `+4`
   - Wrong attempted answer: `-1`
   - Not attempted: `0`
   - This will apply to MCQ, assertion-reason, integer, and numerical questions in the test result scoring.

2. **Normalize existing test question marks**
   - Update existing questions where wrong marks are currently `0` so they use `-1` for wrong attempted answers.
   - Keep `marks_correct = 4` and `marks_unanswered = 0`.

3. **Fix backend result calculation**
   - Update the attempt submission calculation so subject marks and total marks are generated from the same `+4 / -1 / 0` rule.
   - Store a per-question result breakdown in attempt metadata, including:
     - correct / wrong / not attempted
     - marks awarded for that question
     - subject and position

4. **Backfill old submitted attempts**
   - Recalculate already-submitted attempts for this corrected rule.
   - Regenerate total score, correct count, subject scores, and per-question status metadata.
   - This will correct existing PDFs and result sheets after reload/download.

5. **Fix admin student detail display**
   - Replace the current `answer.isCorrect` display logic with the backend-calculated per-question result.
   - Correct answers will show Correct, wrong answers will show Wrong, and marks will match the recalculated score.

6. **Fix student result page consistency**
   - Use the backend-stored subject breakdown instead of recalculating incompletely on the frontend.
   - This prevents mismatch for integer/numerical questions and future question types.

## Expected result

- A student with all attempted answers wrong will show negative marks, e.g. 13 wrong = `-13`.
- A student with 1 correct and 1 wrong will show `+3`.
- A student with 1 correct and 5 wrong will show `-1`.
- The result PDF, admin result sheet, student detail table, and subject marks will all match the same calculation.