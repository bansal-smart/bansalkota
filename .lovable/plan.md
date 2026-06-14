## Fix subject tagging on "11th class test jee 14th june"

Test id: `52740a13-f5c3-4ad9-96ac-229711c91c88` (75 questions, currently all tagged Physics; positions are 0-indexed).

### Steps

1. **Re-tag questions by position** (data update on `test_questions`):
   - Positions 0–24  → `Physics`
   - Positions 25–49 → `Chemistry`
   - Positions 50–74 → `Mathematics`

2. **Update the test's subjects array** on `tests`:
   - Set `subjects = ARRAY['Physics','Chemistry','Mathematics']` for this test.

3. **Backfill already-submitted attempts** so their per-subject breakdown reflects the new tagging:
   - For every `test_attempts` row of this test with status in (`submitted`,`auto_submitted`), call `public._backfill_subject_metadata_for_attempt(attempt_id)`. This rewrites `metadata.subjects` using the corrected `test_questions.subject` values. Scores/ranks remain unchanged (totals unaffected).

4. **In-progress attempts** need no action — `submit_test_attempt` reads the live `test_questions.subject` at submission time, so once retagged, new submissions will be split correctly.

### Notes
- No schema or RLS changes — pure data updates plus a function call per finished attempt.
- After this runs, the admin result sheet and student result page will display Physics / Chemistry / Mathematics breakdowns correctly.
