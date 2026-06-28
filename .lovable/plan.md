## 1. Realtime Attempts tab with "Not Attempted"

**Scope:** When viewing attempts for a specific test, also show students who are mapped to the test's `course_batches` but have no `test_attempts` row — labelled **Not Attempted**. Statuses update live during the exam.

### Eligible-pool logic (per test)
- Read `tests.batch_ids` (or join table linking tests ↔ batches).
- Fetch all `profiles` whose `batch_label` / batch mapping matches any of those batches.
- Diff against current `test_attempts` rows for that test → unmatched students render as **Not Attempted**.
- For unrestricted tests (no batches), the Not Attempted section is hidden (only real attempts shown).

### Realtime
- In `AdminTestAttemptsPage.tsx`, subscribe to `postgres_changes` on `test_attempts` filtered by `test_id` (when a `testId` is provided) inside a `useEffect`, with proper cleanup.
- On INSERT → add row (status flips Not Attempted → In progress).
- On UPDATE → patch row in state (In progress → Submitted / Auto-submitted).
- On DELETE → remove row (returns to Not Attempted).
- Enable realtime on `test_attempts` via `ALTER PUBLICATION supabase_realtime ADD TABLE public.test_attempts`.

### UI changes (`AdminTestAttemptsPage.tsx`)
- New status pill **Not Attempted** (muted grey).
- Status filter dropdown gains "Not Attempted" option.
- A small "● Live" indicator next to the table title when subscribed.
- Counters at top: Not Attempted / In progress / Submitted / Auto-submitted.
- CSV export includes Not Attempted rows.
- "Not Attempted" rows only render when a specific test is selected (compact mode in Tests Hub) — global view stays attempts-only to avoid a huge cross-join.

## 2. Solution PDF (admin upload, release-gated)

### Schema
- Add `solution_pdf_url text` and `solution_pdf_uploaded_at timestamptz` to `public.tests`.
- Create a private storage bucket `test-solutions` with RLS:
  - Admins/teachers: full access.
  - Authenticated students: read only when the parent test has `results_released_at IS NOT NULL`.
- Update `get_test_result` / response-sheet RPCs to also return `solution_pdf_url` only when `v_released = true`.

### Admin (`CreateTestPage.tsx` or test edit form)
- New "Solution PDF" field: upload to `test-solutions/{test_id}.pdf`, store public path on `tests.solution_pdf_url`. Replace / remove supported.
- Visible badge in test list when a solution is attached.

### Student
- `TestResultPage.tsx`: when `released && solution_pdf_url`, show a "Download Solution PDF" button in the header card.
- `TestResponseSheetPage.tsx`: same button in the toolbar (hidden until released).

## Files touched

- `src/pages/AdminTestAttemptsPage.tsx` — realtime subscription, Not Attempted rows, filter + counters.
- `src/pages/CreateTestPage.tsx` (and edit flow) — Solution PDF upload control.
- `src/pages/TestResultPage.tsx`, `src/pages/TestResponseSheetPage.tsx` — gated download button.
- `supabase/migrations/*` — columns on `tests`, realtime publication, storage bucket + policies, RPC patch.

## Open assumptions
- "Batch mapping" uses `profiles.batch_label` ↔ `course_batches.name` (current pattern). If a different join exists I'll adapt during build.
- Solution PDF is a single file ≤ 20 MB; private bucket served via signed URL on click.
