## Goal

1. Only the **student themselves** can submit their own test attempt — no auto-submission, no admin/teacher submitting on their behalf.
2. Result sheets, ranks and percentiles must always reflect the **most recent submitted attempt** per student, not the highest-score or first attempt.

## Changes

### 1. `submit_test_attempt` RPC (database function)
- Remove the admin/teacher/super_admin bypass in the authorization check.
- Only `attempt.user_id = auth.uid()` may submit.
- Keep the existing scoring logic untouched.

### 2. Frontend — kill remaining auto-submit paths
- `src/pages/TestTakingPage.tsx`: confirm there is no timer-triggered or visibility-triggered auto-submit left; if any remains, replace with a "Time up — please click Submit" modal that requires the student to click Submit. (Tab-switch auto-submit is already disabled from earlier turn.)
- Admin "reopen" / "quick resume" stays — admins can re-allow, but cannot submit for the student.

### 3. "Latest submission wins" everywhere results are computed

- **`admin_test_result_sheet(_test_id)`** — change the `attempts` CTE from
  `ORDER BY ta.user_id, ta.score DESC, ta.submitted_at DESC`
  to
  `ORDER BY ta.user_id, ta.submitted_at DESC NULLS LAST`
  so the latest submitted attempt is picked per student.

- **`get_test_rank(_attempt_id)`** — today it ranks across every submitted attempt, which double-counts students who attempted twice. Switch the rank/percentile/topper/average aggregates to use only the latest submitted attempt per `user_id` (CTE with `DISTINCT ON (user_id) ... ORDER BY user_id, submitted_at DESC`).

- **`submit_test_attempt`** percentile block — same fix: compare against each student's latest submitted attempt, not every historical attempt.

- **Student-side result page (`src/pages/TestResultPage.tsx`)** — when looking up an attempt by test slug without an attempt id, fetch the latest submitted attempt (`ORDER BY submitted_at DESC LIMIT 1`) instead of the first/best.

### 4. Data hygiene (one-off, inside the same migration)
- Recompute `percentile` for every already-submitted attempt using the new "latest per user" basis, so existing result pages are consistent immediately.

## Technical notes

- All scoring changes are in Postgres functions; a single migration covers `submit_test_attempt`, `get_test_rank`, `admin_test_result_sheet`, plus a `DO` block that calls a small percentile recompute for existing rows.
- No table schema changes, no new columns, no new RLS policies — existing `test_attempts` RLS already restricts UPDATE to the owning student, which combined with the RPC change enforces "only student submits".
- Re-attempt flow is unaffected: admin reopen still creates/updates an `in_progress` row; the student must press Submit to finalize.

## Out of scope

- No change to test creation, question bank, or admin reopen UI.
- No change to CBT login or auth.

Shall I switch to build mode and apply this?
