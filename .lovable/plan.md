## Goal
Let admins schedule every test with a date/time window. Once the end time passes, results auto-release and admins can download a subject-wise result sheet matching the uploaded "RT-03 JEE MAIN PATTERN" format (Roll No, Name, Batch, Phy, Chem, Maths, Total, %age, Rank + Absents + Max/Min/Avg).

## 1. Test scheduling (admin UI)
In the Create/Edit Test form (`src/pages/CreateTestPage.tsx` and the test detail/edit screens):
- Add three required-when-scheduled fields:
  - **Test date** (date picker)
  - **Start time** (writes to `tests.starts_at`)
  - **End time / Results release time** (writes to `tests.ends_at`)
- Keep existing `auto_release = true` default — DB function `test_results_released()` already releases results when `now() >= ends_at`.
- Add a `Manual release now` button on the test detail page that sets `results_released_at = now()` (useful if admin wants to release early).
- Show a clear scheduled badge: `Scheduled · 07 Jun 2026 · 09:00 – 12:00` and a live countdown to release.

No schema migration required — `starts_at`, `ends_at`, `auto_release`, `results_released_at` already exist.

## 2. Result aggregation
Create a SECURITY DEFINER SQL function `admin_test_result_sheet(_test_id uuid)` that returns one row per enrolled / attempted student:

```
roll_no, full_name, batch_name,
<subject>: marks  (one column per subject of the test)
total_marks, percentage, rank, status ('present' | 'absent')
```

Logic:
- Subjects come from `tests.subjects` (already an array).
- Per-subject marks pulled from `test_attempts.metadata->'subjects'->><subject>->>'score'` (already populated by `submit_test_attempt`).
- Absent = student is in the allowed batch (`tests.cbt_allowed_batch_ids` ∪ enrollments through the course) but has no submitted attempt.
- Rank = dense_rank on total, absents go to bottom with rank label `ABS`.
- Also return summary `{max, min, avg}` per subject and overall.
- Guarded with `is_admin_or_super(auth.uid()) OR has_role(..., 'teacher')`.

## 3. Admin Results page
New route `/admin/tests/:testId/results` (link from Admin Tests Hub and from each scheduled test card after release):
- Header: test title, date, M.M. (total_marks), batch(es).
- Table identical to the uploaded PDF layout: Roll No · Name · Batch · per-subject cols · Total · %age · Rank.
- Footer rows: MAX / MIN / AVG per column.
- Buttons:
  - **Download PDF** — react-pdf or html2pdf rendering of the same table layout (institute-style heading "XI-JEE BULLS EYE / RT-03 JEE MAIN PATTERN" pulled from test title + date + M.M.).
  - **Download CSV / Excel** — same columns via SheetJS.
- If results not yet released, show a locked state with countdown and the early-release button (admins only).

## 4. Student-side effect
- Students already see results only after `test_results_released()` returns true via `get_test_rank`. No change beyond ensuring the UI shows the scheduled release time when locked.

## Technical notes
- Files to edit:
  - `src/pages/CreateTestPage.tsx`, `src/pages/AdminTestDetailPage.tsx`, `src/pages/AdminTestsHubPage.tsx`
  - New: `src/pages/AdminTestResultPage.tsx`, `src/lib/results/exportResultSheet.ts` (PDF + XLSX)
  - New migration: `admin_test_result_sheet` function + grant execute to authenticated.
- Libs to add: `xlsx` (already may be present — check) and `jspdf` + `jspdf-autotable` for the PDF.
- Batch label comes from `course_batches.name` joined via `profiles.batch_id`.
- Roll number from `profiles.roll_number`.

## Out of scope (ask before adding)
- Emailing the PDF to parents automatically.
- Multi-test consolidated rank sheets across an RT series.
