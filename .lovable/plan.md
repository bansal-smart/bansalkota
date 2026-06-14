## Goal

Give admins a per-test "Exclude from results" control. Excluded students' attempts are hidden from the result sheet, do not count toward rank/percentile/topper/average, and the remaining students' ranks are recomputed accordingly.

## Changes

### 1. Database — store exclusions per test
New table `public.test_result_exclusions`:
- `test_id` (FK → `tests.id`)
- `user_id` (FK → profile user)
- `excluded_by`, `reason`, `created_at`
- Primary key `(test_id, user_id)`
- RLS: only admin / super_admin / teacher can read or write
- GRANTs: `authenticated` (read/write gated by RLS), `service_role` all

### 2. Database — apply exclusions everywhere ranks are computed

Update three functions to filter out `(test_id, user_id)` pairs present in `test_result_exclusions`:

- **`admin_test_result_sheet(_test_id)`** — drop excluded users from both the `attempts` CTE and the `audience` CTE so they don't appear in the sheet at all. Rank window recomputes over the remaining students automatically.
- **`get_test_rank(_attempt_id)`** — exclude them from the `latest` CTE used for rank/total/topper/average. If the requester themselves is excluded, return `{ excluded: true }` so the UI can show "Your result has been excluded by the admin."
- **`submit_test_attempt`** percentile block — same filter on the comparison set.

### 3. Admin UI — exclusion controls

On `src/pages/AdminTestResultPage.tsx`:
- Add an "Exclude" / "Include" toggle button on each student row.
- Add a small "Excluded students" panel at the top showing currently excluded students with an "Include back" action.
- Toggling calls a new RPC `admin_toggle_result_exclusion(_test_id, _user_id, _exclude, _reason)` that inserts/deletes from `test_result_exclusions` (admin/super_admin only).
- After toggle, refetch `admin_test_result_sheet` so ranks update immediately.

### 4. Student side — graceful message when excluded

`src/pages/TestResultPage.tsx`: when `get_test_rank` returns `excluded: true`, show a clear notice ("Your result for this test has been excluded by the admin. Please contact your center for details.") instead of rank/percentile cards. Score breakdown of their own attempt remains visible.

## Technical notes

- Single migration: new table + GRANTs + RLS + the three function replacements + the `admin_toggle_result_exclusion` RPC.
- No change to `test_attempts` data — exclusion is non-destructive and reversible.
- Re-attempt flow unaffected; the "latest submitted attempt per user" logic is preserved, just filtered.

## Out of scope

- Bulk exclude by CSV (can be added later).
- Auto-exclusion rules (e.g., by batch). Manual per-student only.

Shall I switch to build mode and apply this?
