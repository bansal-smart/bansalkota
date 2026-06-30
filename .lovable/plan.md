## Goals

1. Students see only tests relevant to their batch (or genuinely open tests), not every published test.
2. For each test a student has submitted, they can download both an auto-generated **scorecard PDF** and the admin-uploaded **solution PDF** (when released).

---

## 1. Batch-scoped test visibility

**Where:** `src/pages/TestListPage.tsx` (route `/my-tests`) and `src/components/LiveTestsWidget.tsx` (student dashboard widget).

**Logic (lenient mode):** show a published, non-CBT test `t` to the student if any of:
- `t.cbt_allowed_batch_ids` is `NULL` or empty → open test, visible to all
- student's `profile.batch_id` is contained in `t.cbt_allowed_batch_ids`
- student is enrolled in `t.course_id` (already implicit via the "course" grouping)
- student already has an attempt for `t` (so historical results never disappear)

**Implementation**
- Fetch the student's `profile.batch_id` once (alongside enrollments).
- Filter the `tests` list client-side using the rule above (server `tests` SELECT policy stays public-read for simplicity; we just hide irrelevant rows in the UI). Same filter applied in `LiveTestsWidget`.
- Empty state copy updated to "No tests assigned to your batch yet."

## 2. Result PDFs for attempted tests

### 2a. Admin-uploaded solution PDF
Already wired in `TestResultPage.tsx` (storage bucket `test-solutions`, gated by `results_released_at`). We will additionally surface a **"Solution PDF"** button on each submitted row in `TestListPage` / `LiveTestsWidget` "Recent results", linking to the result page where the download lives. No backend change.

### 2b. Auto-generated scorecard PDF
New client-side generator using `jspdf` + `jspdf-autotable` (lightweight, already common; install via `bun add`).

**Contents** (one page, Bansal-branded header):
- Student name, roll number, batch, centre
- Test title, exam pattern, date submitted, duration used
- Total score / max, percentage, rank (if released), percentile
- Subject-wise table: subject, attempted, correct, score / max
- Per-question status table: Q#, subject, status (Correct / Wrong / Unattempted / Bonus), marks
- Footer: generated-on timestamp + bansalkota.com

**Data source:** the existing `attempt.result` / `attempt.metadata` already produced by `score_test_attempt` — no new RPC needed. Profile info pulled from `profiles` + `course_batches` + `centres` (one query).

**Where the button appears**
- `TestResultPage.tsx`: primary "Download Scorecard PDF" button next to the existing solution PDF button.
- `TestListPage.tsx`: on each submitted test row, a small "PDF" icon button that opens the result page (kept simple — generation lives in one place).

**New file:** `src/lib/tests/generateScorecardPdf.ts` — pure function `(attempt, test, profile) => Blob` invoked on click.

---

## Files touched

- `src/pages/TestListPage.tsx` — fetch batch_id, apply visibility filter, add "View result" link for submitted attempts.
- `src/components/LiveTestsWidget.tsx` — same visibility filter.
- `src/pages/TestResultPage.tsx` — add "Download Scorecard PDF" button calling the new generator.
- `src/lib/tests/generateScorecardPdf.ts` *(new)* — jsPDF scorecard builder.
- `package.json` — add `jspdf`, `jspdf-autotable`.

## Non-goals

- No schema migration. `cbt_allowed_batch_ids` already exists and is the source of truth for batch scoping.
- No change to admin "Create Test" UI — admins already pick allowed batches there.
- CBT-mode tests (`test_mode='cbt'`) remain excluded from the student `/my-tests` list (they go through the CBT kiosk flow).
