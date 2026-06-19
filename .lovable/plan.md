## Test Platform Hardening Plan

### 1. Partial Marking (MCQ-Multi) — fix + standardize

Apply the JEE Advanced partial-marking scheme by default for every Multiple-Correct question, regardless of the per-question `partial_marking` toggle. The toggle still surfaces in the editor but is no longer the gate for partial credit.

Update `public.submit_test_attempt` (new migration) so the `mcq-multi` branch becomes:

- All correct selected, none wrong → `+marks_correct` (e.g. +4)
- Any wrong option selected → `marks_wrong` (e.g. −2)
- Subset of correct, no wrong picks → `+1` per correctly picked option, capped at `marks_correct`
- Nothing selected → `marks_unanswered`

This removes the silent failure where admins forgot to tick `partial_marking` on imported questions. The legacy `partial_marking_scheme = 'standard'` path is dropped — Advanced rules apply uniformly. Match-following keeps its existing per-pair partial logic (already working).

### 2. Question-wise Numeric Input Validation

In `src/pages/TestTakingPage.tsx` `NumericInput`:

- Derive `allowDecimal` and `allowNeg` from the question: `integer` → no decimal, no minus (digits only); `numerical` → decimals + minus allowed.
- Hide/disable the `.` and `-` keypad buttons when not allowed (greyed out, no-op on click).
- Update placeholder accordingly ("Integer only" vs "e.g. -3.14").
- Strip any pre-existing invalid characters when the question type changes (defensive, in case answer was stored from a different type).
- Show a small caption under the keypad reflecting the constraint.

`NumericInput` will receive the actual `question_type` instead of a generic `format` string.

### 3. Window/Tab-Switch Auto-Submit After 3 Warnings

Rewrite the visibility handler in `TestTakingPage.tsx`:

- Count a violation each time `document.hidden` becomes true (debounced 500 ms so the warning modal re-show doesn't double-count).
- After violation 1 and 2, show the existing warning modal with updated copy: "Warning 1 of 3" / "Final warning — next switch auto-submits".
- On violation 3, set `blockedRef = true`, persist `metadata.auto_submitted_reason = 'window_switch'` and `metadata.tab_switches = 3`, then call `handleSubmit(true)` immediately. Show a non-dismissible "Test auto-submitted due to repeated window switches" modal that routes back to `/my-tests`.
- Also wire `window.blur` as a secondary trigger for desktop alt-tab scenarios where `visibilitychange` doesn't fire reliably.
- Keep the existing "warn but never auto-submit" comment removed.

No DB schema change required — we already store `tab_switches` and `metadata` on `test_attempts`. Re-entry remains allowed (per "Auto-submit only" choice); admin can still grant a reattempt via the existing reattempt request flow.

### 4. In-Test Support Query Form

Add a small "Need help?" button in the top bar of `TestTakingPage` (next to the timer). Clicking opens a modal with:

- Read-only context (auto-filled): student name, test title, attempt id, current question number
- Single textarea: "Describe your issue" (10–1000 chars, zod-validated client side)
- Submit posts into a new `public.test_support_queries` table

New migration:

```text
test_support_queries (
  id, user_id (default auth.uid()), attempt_id, test_id,
  question_position int, message text, status text default 'open',
  created_at, updated_at
)
```

- GRANTs: `SELECT, INSERT` to authenticated; `ALL` to service_role.
- RLS: students INSERT/SELECT their own rows; staff (admin / super_admin / teacher) SELECT and UPDATE all.
- Trigger calls existing `public.notify_admins(...)` so the support team gets a notification with deep-link `/admin/support-queries`.

Admin surface (lightweight): add `src/pages/AdminTestSupportPage.tsx` listing open queries with student, test, message, timestamp, and a "Mark resolved" button. Linked from the Admin Test Platform Hub.

### Files touched

- `supabase/migrations/<new>_partial_marking_and_support.sql` — rewrite `submit_test_attempt` mcq-multi branch + create `test_support_queries` table/policies/trigger
- `src/pages/TestTakingPage.tsx` — numeric validation, 3-strike auto-submit, support modal, top-bar button
- `src/pages/AdminTestSupportPage.tsx` — new admin page
- `src/App.tsx` — route for the new admin page
- `src/pages/AdminTestPlatformHub.tsx` — tile linking to the support page

### Out of scope

- No changes to scoring for single-correct, numerical, integer, match-following beyond the existing behavior.
- No reattempt-blocking on the 3rd violation (per your "Auto-submit only" choice).
- No SMS/WhatsApp escalation for support queries — handled via existing in-app notifications.
