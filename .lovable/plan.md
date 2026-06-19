## Goal

Make per-question partial marking honor the admin toggle, and tighten input validation for Numerical vs. Integer questions on both the admin editor and the student test runner.

---

## 1. Partial Marking actually applied

**Root cause:** The server scoring function `submit_test_attempt` (Lovable Cloud RPC) currently *always* applies the JEE-Advanced partial rule for `mcq-multi`, regardless of the per-question `partial_marking` flag set in the Question Editor. So toggling the "Enable partial marking" checkbox has no effect — students always get +1 per correctly-picked option on a partial subset.

**Fix (migration on `public.submit_test_attempt`):**

For `question_type = 'mcq-multi'`:
- Exact match (all correct picked, no wrong): `+q.marks_correct` (unchanged).
- Any wrong picked: `q.marks_wrong` (unchanged).
- Subset of correct, no wrong:
  - If `q.partial_marking = true` → `LEAST(correct_picked, q.marks_correct)` (current behavior, JEE-Adv rule).
  - If `q.partial_marking = false` → `0` (no credit unless fully correct; no negative since no wrong option picked).

For `match-following` / `matching-list`: already respects `q.partial_marking` — no change.

For `numerical` / `integer` / `mcq-single` / others: no partial concept — no change.

The migration replaces only the `WHEN 'mcq-multi'` branch inside the existing function; everything else (per-question scoring loop, subject rollup, percentile, metadata write) stays identical.

## 2. Per-question input validation

### Student runner — `src/pages/TestTakingPage.tsx`
The on-screen `NumericInput` keypad already disables `.` and `-` for `integer`. No change needed there.

Tighten the defensive cleanup so a stored answer that contains a stray `.` or `-` for an integer question is sanitized **and** trimmed of leading zeros only when safe (keep `0`). Also re-run the cleanup whenever `value` or `questionType` changes (currently only `questionType`), so a bad value injected from elsewhere is corrected immediately.

### Admin editor — `src/pages/CreateTestPage.tsx` (per-question "Correct Answer" field, ~line 1231)
- For `integer`: change `inputMode` to `"numeric"`, add `pattern="-?[0-9]*"`, and filter `onChange` to strip any character that isn't a digit or a single leading `-`. Reject paste of decimals with a toast.
- For `numerical`: keep `inputMode="decimal"`, but filter `onChange` to allow only digits, one leading `-`, and at most one `.`.
- Update placeholder copy: integer → `"Whole number, e.g. -7"`, numerical → `"Decimal allowed, e.g. -3.14"`.
- `isValid` check (~line 531) already rejects non-numeric; add an extra guard that for `integer` the parsed value must equal `Math.trunc(value)`.

### Admin editor — `src/components/QuestionEditorDialog.tsx` (Correct Answer field, ~line 422)
Same two-mode treatment: when `question_type === 'integer'`, switch the input from `type="number" step="any"` to a text input with the integer filter described above (HTML `type=number` still permits `.` in many browsers). Numerical stays `type="number" step="any"`.

Save path (`numerical_answer: Number(...)`) is unchanged but will now always receive a clean string.

---

## Verification

1. **Partial OFF, mcq-multi (4 options, 2 correct):** pick 1 of 2 correct → score `0`; pick both correct → `+marks_correct`; pick 1 correct + 1 wrong → `marks_wrong`.
2. **Partial ON, same question:** pick 1 of 2 correct → `+1`; pick both → `+marks_correct`; pick 1 correct + 1 wrong → `marks_wrong`.
3. **Integer question (admin):** typing `3.14` is blocked / stripped to `314`; typing `-7` works; saving persists `-7`.
4. **Numerical question (admin):** `-3.14` saves as `-3.14`; `--3` is reduced to `-3`; `3.1.4` is reduced to `3.14`.
5. **Student keypad:** integer question — `.` and `-` keys disabled (already true); numerical — both enabled.

## Out of scope

- No schema changes to `test_questions` or `tests`.
- No changes to scoring for `mcq-single`, `numerical`, `integer`, `match-following`, `matching-list`.
- No changes to bulk-import parsers (`DocxBulkImportDialog`, `DocxCommonImportDialog`) — they already set `partial_marking` correctly when the user/template requests it.
