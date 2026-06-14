## Issues

1. **Per-subject marks always show 0** while total is correct (e.g. 13 marks but Physics/Chem/Maths all 0). Root cause: `submit_test_attempt` computes `subject_data` correctly and returns it, but never writes it into `test_attempts.metadata`. The admin RPC `admin_test_result_sheet` reads `metadata->'subjects'->key->'score'`, which is NULL for every existing attempt, so per-subject columns collapse to 0.

2. **Header reads "THE BANSAL CLASSES PVT. LTD."** in the master result XLSX, master PDF, and individual student PDF. User wants "THE" removed.

## Fix Plan

### A. Database — persist + backfill subject breakdown
New migration:

1. `CREATE OR REPLACE FUNCTION public.submit_test_attempt(...)` — same body as today, with the final `UPDATE test_attempts` extended to merge `subject_data` into `metadata`:

   ```sql
   metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('subjects', subject_data)
   ```

2. `CREATE OR REPLACE FUNCTION public.backfill_attempt_subject_metadata()` (security definer, admin-only) — for every submitted/auto_submitted attempt where `metadata->'subjects'` is NULL, recompute subject_data by replaying scoring against `test_questions` and `answers`, then update metadata. Run it once inline at the end of the migration with `PERFORM public.backfill_attempt_subject_metadata();`.

   Scoring rules reused: per question_type same as `submit_test_attempt`, accumulator `{total, correct, attempted, score}` keyed by `COALESCE(q.subject,'General')`.

### B. Frontend — remove "THE" from headers
File: `src/pages/AdminTestResultPage.tsx`
- Line 217 (XLSX): `"THE BANSAL CLASSES PVT. LTD."` → `"BANSAL CLASSES PVT. LTD."`
- Line 265 (Master PDF header): same
- Line 358 (Student PDF header): same

## Verification
- After migration, query `SELECT metadata->'subjects' FROM test_attempts WHERE id='cef05b83-...'` — expect a populated object whose `score` sums to 13.
- Re-open the Admin Test Result page → student row shows non-zero subject splits, individual student PDF "Subject / Metric" table shows correct subject marks summing to the total.

## Out of Scope
No changes to the test-taking flow, the marking values, or the UI of admin pages beyond the header string.
