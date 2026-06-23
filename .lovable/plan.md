## Goal
Stop auto-sending result SMS on release. Add an explicit "Send Result SMS" button next to "Master Result PDF" on the admin test result page, and update the SMS function to also message absent students (with `Rank Absent`).

## Changes

### 1. `src/pages/AdminTestResultPage.tsx`
- In `releaseNow()`: remove the fire-and-forget `supabase.functions.invoke("prpsms-send-result-sms", …)` block. Only release the result; no SMS.
- Add new state `sendingResultSms` and handler `sendResultSms()` that:
  - Confirms via `confirm("Send result SMS to all students (present + absent)?")`.
  - Calls `supabase.functions.invoke("prpsms-send-result-sms", { body: { test_id: test.id } })`.
  - Toasts sent/failed counts.
  - Disabled unless `released` is true.
- Add a new button right next to "Master Result PDF" (lines ~921–928):
  - Label: "Send Result SMS" with `MessageSquare` (or `Send`) icon.
  - Shows spinner while sending.
  - Tooltip: "Send result SMS to all students" / "Available after results are released".

### 2. `supabase/functions/prpsms-send-result-sms/index.ts`
- Currently only iterates `test_attempts` with `status='submitted'`. Change so absent students are included:
  - Fetch the test's roster the same way the result page resolves "absent" — load enrollments / `cbt_roster.json` mapping, or simpler: load all `profiles` linked to the test via `test_attempts` (any status) OR via the roster source the admin page uses.
  - Re-read `AdminTestResultPage` to confirm how absent students are determined, then mirror that source in the edge function so the audience matches what the admin sees.
- For each absent student: render `Result` template with `score = "Absent"` (or `Score —`) and `rank = "Absent"` instead of `Rank N/T`.
- For present students: keep current score + rank.
- Log each send into `sms_send_log` as today.
- Return `{ sent, failed, total, absent_sent }`.

## Technical notes
- Confirm absent-student source: inspect how `presentRows` / absent classification is built in `AdminTestResultPage.tsx` (the existing `rows` array with `status` field). The edge function will need to replicate that — likely by joining test enrollments / center roster against `test_attempts`. I'll read the relevant loader before implementing.
- Keep the SMS template unchanged (DLT-approved `Result`); just substitute different values for absent rows.
- No DB schema changes. No new secrets.
