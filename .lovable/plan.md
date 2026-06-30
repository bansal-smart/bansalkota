## Problem

On `/admin/tests-hub?tab=attempts`, when admin picks a single test from the **test dropdown** (e.g. "fasd"), only students who actually clicked "Start" appear (status: in progress / submitted / auto-submitted). Students who belong to the test's batch but never opened it are not listed at all — so admin can't see who's **absent**.

The "Not Attempted" roster is already implemented via the `admin_test_not_attempted` RPC, but the page only calls it when a `testId` **prop** is passed (i.e. the per-test page). The global Attempts tab leaves it empty.

## Fix

Make the global Attempts view behave like the per-test view as soon as a test is selected in the dropdown.

### `src/pages/AdminTestAttemptsPage.tsx`

1. **Treat dropdown selection like a scoped test.** Compute `effectiveTestId = testId ?? (testFilter !== "all" ? testFilter : null)`.
2. **Fetch absent roster whenever `effectiveTestId` changes.**
   - Call `supabase.rpc("admin_test_not_attempted", { _test_id: effectiveTestId })`.
   - Clear `notAttempted` when `effectiveTestId` is null.
   - Add `effectiveTestId` to the `useEffect` dependency so switching tests in the dropdown refetches.
3. **Build the combined rows using `effectiveTestId`** (instead of the prop), so absent rows render in the global view too.
4. **Realtime subscription**: re-subscribe per `effectiveTestId` so updates filter correctly when a test is chosen in the dropdown. On INSERT for that test, also drop the matching user from `notAttempted` (already done).
5. **UI polish**
   - Show the "Not Attempted" stat card whenever `effectiveTestId` is set.
   - Enable the "Not attempted" status filter option in the same condition.
   - Render the status pill label as **"Absent"** (instead of "not attempted") for clearer admin wording; keep underlying status value `not_attempted`.
6. **No schema changes.** The RPC and table already exist; the test "fasd" appearing in the dropdown confirms the data path.

### Out of scope
- Per-test page (`/admin/tests/:id/attempts`) already works; no change needed.
- No changes to test-taking, batch assignment, or RLS.

## Verification
- Open Attempts tab, select "fasd" in the test dropdown → all batch students appear with status "Absent" except Mayank ("In progress"). Counts card shows "Not Attempted: N".
- When a student starts the test, their row flips from Absent → In progress in real-time, and the Not Attempted count decreases.
- Setting dropdown back to "All tests" hides the absent rows (since absence is per-test).
