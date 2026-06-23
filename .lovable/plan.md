## Bonus Marking for Test Questions

Lets admins flag a question as **bonus** when it's wrong/ambiguous. Every student who appeared gets full marks (`marks_correct`) for that question — attempted or not. Scores, ranks, and leaderboards recompute immediately, even after results are released. Students see a "Bonus" badge on the response sheet (no reason shown).

### Database

1. `test_questions.is_bonus boolean DEFAULT false` (+ index on `(test_id, is_bonus)`).
2. Audit table `public.test_question_bonus_log` — `question_id`, `test_id`, `marked_by`, `marked_at`, `action` (`marked` | `unmarked`). RLS: admin/super_admin read; inserts only via the RPC below. GRANTs to `authenticated` (read) and `service_role`.
3. **Patch `public.score_test_attempt`**: at the top of the per-question loop, if `q.is_bonus` is true → `q_marks := q.marks_correct`, `is_correct := true`, `is_attempted := COALESCE(was_attempted, false)` (counted as correct in totals but not auto-incrementing `attempted_count` unless they actually selected something). Per-question payload gets `"bonus": true`.
4. New RPC `public.admin_set_question_bonus(_question_id uuid, _bonus boolean)` — `SECURITY DEFINER`, admin/super_admin only:
   - Updates `test_questions.is_bonus`.
   - Inserts into bonus log.
   - Re-runs `score_test_attempt` for every submitted attempt of that test (loop over `submitted`/`auto_submitted`).
   - Calls `refresh_test_leaderboard(test_id)` once at the end.
   - Returns `{ updated_attempts: n }`.
5. **Patch `public.get_attempt_response_sheet`**: include `is_bonus` in each question object so the student UI can render the badge.

### Admin UI

In `src/pages/AdminTestDetailPage.tsx`, **Questions tab**:
- Add a "Bonus" column with a toggle switch per row (admin/super_admin only).
- On toggle: call the RPC, show a confirm dialog ("Award full marks to all students for this question? Scores & ranks will recompute now."), toast result count, then `load()`.
- Show a small amber "Bonus" pill next to the question text when `is_bonus`.

Optional small banner in **Summary tab**: "N bonus question(s) active" when any are marked.

### Student UI

In the response-sheet page (renders `get_attempt_response_sheet` output, currently `src/pages/TestResponseSheetPage.tsx`):
- If `question.is_bonus === true`, render an amber `Bonus` badge next to the question header.
- Force the marks display to `+marks_correct` regardless of attempt/selection.

### Out of scope

- No per-student override (always all-or-nothing per question).
- No reason field (UX confirmed: badge only).
- No notification to students on re-grade (silent score bump in addition to the visible badge).

### Technical notes

- Recompute path reuses existing `score_test_attempt` so all subject/percentile/metadata logic stays in one place.
- `refresh_test_leaderboard` already drives `get_test_rank`, so released-results screens update on next fetch (≤30s cache window in `get_test_rank`).
- Migration order: ALTER TABLE → CREATE TABLE log + GRANTs + RLS + policies → CREATE OR REPLACE functions.