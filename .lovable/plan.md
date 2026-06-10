# Super Admin – Test Platform Control Center

Goal: extend the existing Admin/Super-Admin panel so a super admin can monitor and manage **every part of the JEE/NEET live test engine** built in earlier phases (tests, questions, imports, attempts, results) from one place.

The current admin panel already has standalone pages for Tests, Test Series, Question Bank, and Student Reports. They work in isolation. This plan adds:
- A single **Test Platform overview** with live KPIs.
- A real **Attempts explorer** (no admin view of attempts exists today).
- A proper **per-test admin detail page** with question table, attempts, leaderboard, and analytics.
- An **Import Batches** page (we created `question_import_batches` for Word uploads but have no UI to view/undo them).
- Tightened question-bank + tests pages so a super admin can edit / delete anything.

No changes to the test-taking experience or scoring logic.

---

## 1. New sidebar group — "Test Platform"

In `src/components/AdminLayout.tsx`, insert a new labelled section between "Tests" and "Books":

```
Test Platform
  • Overview            /admin/tests-hub
  • All Tests           /admin/tests           (existing)
  • Test Series         /admin/test-series     (existing)
  • Question Bank       /admin/question-bank   (existing, upgraded)
  • Test Attempts       /admin/test-attempts   (new)
  • Import Batches      /admin/test-imports    (new, super-admin only)
```

## 2. New page — `AdminTestsHubPage.tsx`  →  `/admin/tests-hub`

KPI cards + quick links.

KPIs (all from `tests`, `test_attempts`, `test_questions`, `question_bank`, `question_import_batches`):
- Tests total / published / draft
- Questions in bank / by subject (Physics, Chemistry, Maths, Biology)
- Attempts today / this week / all-time
- Avg score % (last 7d), avg duration, completion rate
- Pending imports (`status != 'completed'`)
- Top 5 tests by attempts (last 30d) with avg score + link
- Recent 10 attempts (student, test, score, percentile, submitted_at)
- Subject difficulty chart — avg accuracy per subject (recharts bar)

Layout: 4-up stat grid, 30-day attempt line chart, two-column lists.

## 3. New page — `AdminTestAttemptsPage.tsx`  →  `/admin/test-attempts`

Server-paginated table of `test_attempts` (RLS already allows admin/super-admin/teacher via existing policies).

Columns: student name, test title, status, score, percentile, correct/total, started_at, submitted_at, actions (View result / Reset attempt).

Filters: test (select), status (in_progress / submitted / auto_submitted), student search, date range.

Actions:
- "View result" → opens `/tests/{slug}/result/{attemptId}` (existing route, admin already permitted).
- "Reset attempt" (super-admin only) → confirm dialog, deletes the row so the student can retake. Uses existing RLS.
- CSV export of the filtered list.

## 4. New page — `AdminTestDetailPage.tsx`  →  `/admin/tests/:slug`

Tabs:
1. **Summary** — meta (type, exam pattern, duration, marks, total Qs), publish toggle, edit/delete buttons.
2. **Questions** — list pulled from `test_questions`; inline reorder, edit, delete, "Add from bank", "Bulk import .docx" (re-using existing `DocxBulkImportDialog`).
3. **Attempts** — embedded attempts table filtered to this test.
4. **Leaderboard** — top 20 by score with percentile and time taken.
5. **Analytics** — per-question accuracy (% correct vs attempts), avg time per question (if `answers.timeSpent` present), hardest 5 / easiest 5 questions, subject break-down chart.

The existing `AdminTestsPage` row gets a "Manage" link pointing here (in addition to the current edit icon which still opens the create/edit form).

## 5. New page — `AdminImportBatchesPage.tsx`  →  `/admin/test-imports` (super-admin only)

Reads `question_import_batches`. Shows filename, target (test/bank), uploaded_by (joined to `profiles.full_name`), question count, image count, status, errors collapsible.

Actions:
- View parsed questions (links to question bank filtered by `import_batch_id`).
- **Undo batch** — deletes rows from `question_bank`/`test_questions` where `import_batch_id = batch.id`, then deletes the batch row. Confirm dialog with row counts.

## 6. Upgrade `AdminQuestionBankPage.tsx`

It is currently a 26-line stub. Replace with a real table reusing the same `QuestionBankPanel` UI already used inside test-edit, plus:
- Filters: subject, chapter, difficulty, type, source filename, import batch.
- Bulk select → delete / move to test / change difficulty.
- Stats header: total questions, by type, by subject.
- "Bulk import .docx" button (re-uses `DocxBulkImportDialog`, target = bank).

## 7. Routing

In `src/App.tsx`, add five routes inside the existing `AdminLayout` block:

```tsx
<Route path="tests-hub" element={<AdminTestsHubPage />} />
<Route path="tests/:slug" element={<AdminTestDetailPage />} />
<Route path="test-attempts" element={<AdminTestAttemptsPage />} />
<Route path="test-imports" element={<RequireSuperAdmin><AdminImportBatchesPage /></RequireSuperAdmin>} />
```

(`RequireSuperAdmin` is the existing guard used by Admin Management / Platform Settings.)

## 8. Data access

All reads use the existing client and current RLS — admin / super_admin / teacher already have read on `tests`, `test_questions`, `test_attempts`, `question_bank`, `question_import_batches`. No new policies needed.

Mutations used by the new pages:
- Toggle publish, delete test → already covered by `tests` policies.
- Delete attempt → super-admin only, allowed by current `test_attempts` admin policy.
- Undo import batch → super-admin only, deletes child rows then batch.

No SQL migration is required for this plan.

## Files

**New**
- `src/pages/AdminTestsHubPage.tsx`
- `src/pages/AdminTestAttemptsPage.tsx`
- `src/pages/AdminTestDetailPage.tsx`
- `src/pages/AdminImportBatchesPage.tsx`
- `src/components/admin/TestKpiCards.tsx`
- `src/components/admin/TestAttemptsTable.tsx` (reused by hub + detail + standalone page)

**Edited**
- `src/components/AdminLayout.tsx` (new "Test Platform" sidebar group)
- `src/App.tsx` (4 new routes)
- `src/pages/AdminQuestionBankPage.tsx` (real implementation with filters + import)
- `src/pages/AdminTestsPage.tsx` (add "Manage" link → detail page)

## Out of scope
- Changes to scoring, the test-taking UI, or student dashboard widgets.
- New database tables, columns, or RLS changes.
- Email/notification triggers when an attempt is reset or batch is undone.
- Re-evaluation RPC and rank CSV (still Phase 6, separate task).
