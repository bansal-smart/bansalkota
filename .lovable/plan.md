# Plan

## 1. "Result" button on every test in admin listings

**Where**: `src/pages/AdminTestsPage.tsx` (the main test list) and the "All tests" tab inside `src/pages/AdminTestsHubPage.tsx`.

- Add a new action icon (FileSpreadsheet) in the Actions column linking to `/admin/tests/:slug/result` (route already exists → `AdminTestResultPage.tsx`).
- Tooltip: "Result sheet".
- Same button is already on the test detail page; this just brings it forward to the list so admin doesn't need to open each test.

## 2. Individual student result view

`AdminTestResultPage.tsx` currently shows the table with per-student rows. Enhance:

- Make each student row clickable → opens a slide-over / modal showing that student's full attempt: question-by-question correct/wrong, time, subject-wise breakdown. Data source: `test_attempts` row + `test_questions` + `get_test_question_answers`.
- Add "Download student PDF" inside the modal (single-page summary using jsPDF).

## 3. Master Result PDF (Bansal-branded)

Replace the current plain jsPDF export with a branded master sheet, only downloadable once `test_results_released(test_id) = true` (existing rule). Layout:

```text
┌─────────────────────────────────────────────────────┐
│  [Bansal Logo watermark — centered, 8% opacity]     │
│                                                     │
│  THE BANSAL CLASSES PVT. LTD.                       │
│  <Test Title>                                       │
│  Date: <starts_at date>   Time: <start–end>         │
│  Pattern: JEE/NEET   Total Marks: xx                │
│  Batches: <names>   Total students: N   Attempted: M│
│                                                     │
│  ┌──────┬──────────┬───────┬─────┬─────┬─────┬────┐ │
│  │ Rank │ Roll No  │ Name  │ Phy │ Chem│ Math│ Tot│ │
│  ├──────┼──────────┼───────┼─────┼─────┼─────┼────┤ │
│  │ ...rows including ABS for absentees...         │ │
│  ├──────┴──────────┴───────┼─────┼─────┼─────┼────┤ │
│  │ MAX / MIN / AVG          │ ... │ ... │ ... │... │ │
│  └─────────────────────────┴─────┴─────┴─────┴────┘ │
│  Footer: generated <timestamp> · page x/y           │
└─────────────────────────────────────────────────────┘
```

Technical details:
- Use `jspdf` + `jspdf-autotable` (already installed).
- Load `bansal-logo.png` as base64, draw via `doc.addImage` on every page with `GState({opacity:0.08})` and large size, centered, before the table.
- Header block drawn in `didDrawPage` so it repeats; autoTable handles pagination automatically.
- Keep existing XLSX export button as-is.
- Lock state: if not released, hide "Download Master PDF" and show countdown + (admin only) "Release now" (already present).

## 4. Bulk "Delete all questions" in test editor

**Where**: `AdminTestDetailPage.tsx` → Questions tab, and the test editor page used when clicking Edit.

- Add a red "Delete all questions" button next to "Master import / Common import".
- Confirms via `useConfirm` ("Delete all N questions in this test?").
- Runs `supabase.from("test_questions").delete().eq("test_id", test.id)`, then reloads.
- Also resets `tests.total_questions` and `total_marks` to 0 via a follow-up update so summary stays consistent.

## 5. Common Import — force subject tagging after upload

**Where**: `src/components/DocxCommonImportDialog.tsx`.

Today the subject-by-range UI exists but is optional. Make it a required step:

- After successful parse, switch the dialog into a new **"Step 2 — Tag subjects"** view before the question list. The "Save to test" button stays disabled until every parsed question number falls inside at least one range (validation message lists the uncovered numbers).
- Pre-fill subject options based on the parent test's `exam_pattern`:
  - JEE patterns → Physics, Chemistry, Mathematics
  - NEET patterns → Physics, Chemistry, Biology
  - Other → all four (existing `SUBJECTS`).
- "Auto-split equally" helper: given subject count k and total N, generates k equal ranges in one click.
- The subject dropdown inside each range only shows the pattern-specific subjects.

## Technical Section

- **Files to edit**:
  - `src/pages/AdminTestsPage.tsx` — add Result icon link.
  - `src/pages/AdminTestsHubPage.tsx` — add Result link in the "All tests" listing rows (if present) and recent tests cards.
  - `src/pages/AdminTestResultPage.tsx` — branded PDF generator, student detail drawer, single-student PDF.
  - `src/pages/AdminTestDetailPage.tsx` — "Delete all questions" button + confirm + cascade update of `total_questions/total_marks`.
  - `src/components/DocxCommonImportDialog.tsx` — required subject-tagging step, exam-pattern-aware subject list, auto-split helper, validation.
- **New file**: `src/lib/results/masterResultPdf.ts` — encapsulates branded PDF rendering (logo watermark, header, autoTable, footer).
- **No DB migration needed** — `admin_test_result_sheet`, `test_results_released`, and scheduling fields already exist.
- **Permissions**: master PDF download still respects `test_results_released`; "Release now" remains admin/super_admin only.

## Out of Scope

- Emailing PDFs to students/parents.
- Cross-test consolidated rank sheets (RT series totals).
- Editing individual student answers from the result page.
