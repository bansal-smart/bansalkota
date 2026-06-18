# Test Engine Hardening + JEE (Advanced) Pattern Support

Two tracks: (A) fix the bugs reported from the 14-Jun test, (B) add JEE (Advanced) Paper-1/Paper-2 capability so the 21-Jun test runs cleanly.

## A. Bug fixes from 14-Jun report

### 1. Score = 0 / wrong subject totals (issues #4, #5)
Root cause is in `submit_test_attempt` (migration 20260614045635):
- Line 108: `q_marks := COALESCE(NULLIF(q.marks_wrong, 0), -1)` — turns an intentional `0` negative-mark into `-1`. For tests configured with no negative marking, every wrong answer silently becomes −1, which can drive Grand Total to 0 or break subject sums.
- Subject bucket key uses raw `q.subject` text, so `"Physics"` vs `"physics "` create two buckets and P+C+M doesn't add up to Grand Total.
- No safety: if every question returns 0 (e.g. all question_type unknown), score is 0 silently with no flag.

Fix in a new migration that replaces `submit_test_attempt`:
- Use `q_marks := COALESCE(q.marks_wrong, -1)` (respect 0).
- Normalise subject key: `lower(btrim(coalesce(q.subject,'general')))` then map to a canonical label kept in metadata.
- Recompute `total_score` as `sum(per_question.marks)` at the end as a cross-check; if it disagrees with the running total, raise and log.
- Store `subjects` with both `total`, `attempted`, `correct`, `wrong`, `unanswered`, `score`, `max_score` so the UI can render P/C/M cleanly.
- Add admin RPC `recompute_test_attempt(_attempt_id)` (admin/super_admin only) so result-day fixes don't need Excel.

### 2. Lost answers on resume / unexpected close (issue #1)
Current `TestTakingPage.tsx` autosaves every 15s and only on explicit save actions. If the tab dies between saves, up to 15s of work is lost; if a save races with reload, the in-memory `answers` overwrites server state.

Fixes:
- Save on every answer change with a 1.5s debounce (in addition to the 15s heartbeat) and on `visibilitychange` → hidden, `pagehide`, and `beforeunload` using `navigator.sendBeacon` to a new edge function `attempt-beacon-save` (keeps working when the tab is closing).
- Use the existing `test_attempt_answer_snapshots` table as an append-only ring buffer: write a snapshot on every save with `saved_at`, `answer_count`, `question_statuses`. Add RPC `restore_attempt_from_snapshot(_attempt_id)` that merges the latest snapshot's `answers` into `test_attempts.answers` when resume detects the live row has fewer answers.
- On resume, fetch latest snapshot and merge missing keys (never delete existing answers); show a toast "Restored N answers from auto-backup".
- Add `localStorage` write-through (`attempt:<id>:answers`) so even total network loss preserves work and is re-uploaded on reconnect.

### 3. Lag / questions not visible (issues #2, #3)
- Preload next 2 and previous 1 question images on mount and on navigation.
- Replace raw `<img>` with a `<TestImage>` component that: sets explicit width/height to prevent layout shift, retries on error (3×, exponential backoff), and shows a "Reload image" button if it still fails.
- Render question text in a fixed-height scroll container so a missing image never hides the option block.
- Add a small "Report this question" button on each question that writes to `reports` with the question id, attempt id, and a screenshot-ready snapshot — gives the test team telemetry instead of "some questions were not visible".

### 4. Detailed response sheet (additional requirement)
`metadata.questions` already stores per-question correctness. Build it out:
- Migration: extend `submit_test_attempt` so each per-question entry also stores `selected`, `correct`, `question_type`, `marks_max`, `partial_credit` flag.
- New page `src/pages/TestResponseSheetPage.tsx` at `/tests/:slug/result/:attemptId/responses` showing, for each question: subject · Q#, the question (text/image), all options with user's selection and the correct option highlighted, marks awarded, and the official explanation.
- Add a "Download response sheet (PDF)" button using the existing print stylesheet.
- Link from `TestResultPage.tsx` and from admin `AdminTestAttemptsPage.tsx`.

## B. JEE (Advanced) Paper-1 / Paper-2 support

Pattern from the attached images. Need four new question behaviours and a paper-level structure.

### 1. Question-type & marking-scheme upgrades
Extend `test_questions.question_type` vocabulary and `submit_test_attempt` scoring:

| Type | Marks (+/partial/zero/−) | Notes |
|---|---|---|
| `mcq-single` | +3 / 0 / 0 / −1 (P1) or +3 / 0 / 0 / −1 (P2) | exists; just data |
| `mcq-multi-partial` | +4 full / +3 / +2 / +1 partial / 0 unanswered / −2 wrong | replaces strict mcq-multi for JEE Adv; rules per attached image |
| `numerical` | +4 / 0 / 0 (P1) ; +4 / 0 / 0 (P2) | exists; tolerance already supported |
| `matching-list-4x5` | +4 / 0 / 0 / −1, one correct option among 4 | render 4 lists × 5 items + 4 MCQ options |
| `question-stem` (linked-numerical) | 2 child numerical Qs per stem, +2 / 0 / 0 each | new stem grouping |

Implementation:
- Replace mcq-multi scoring in `submit_test_attempt` with the partial-marking rule from image 2: full only if user's set == correct; +3 if all four correct chosen and only 3 chosen of correct; +2 if exactly 2 chosen of 3+ correct; +1 if exactly 1 chosen of 2+ correct; 0 if unanswered; −2 otherwise. Gate behind `q.partial_marking = true OR question_type = 'mcq-multi-partial'`.
- For `matching-list-4x5`, store `match_left` (4 lists) and `options` (4 candidate mappings A-D, each a full mapping); correct_answer is the chosen letter. Reuse `mcq-single` scoring.
- For `question-stem`, add `stem_id uuid` + `stem_text` + `stem_image_url` columns on `test_questions`. Migration adds the columns and a GIN index on `(test_id, stem_id, position)`. Child questions group visually under the stem and are scored independently.

### 2. Paper-1 / Paper-2 structure (one test = one paper)
Simplest viable shape for 21-Jun: each Paper is its own `tests` row, but link them with:
- New column `tests.paper_group_id uuid` and `tests.paper_label text` ('Paper 1' | 'Paper 2').
- Admin "Create JEE Advanced Pack" wizard in `AdminTestsHubPage.tsx` that creates 2 tests sharing a `paper_group_id`, pre-fills section counts (4/4/4/4 for P1, 4/5/5/2 for P2) and marking schemes from the image.
- Student-side: when opening a test that has a sibling, show "Paper 1 / Paper 2" tabs on the test cover and on the result page combine totals (60 + 60 = 120) with subject breakdown.

### 3. Section-aware UI in `TestTakingPage.tsx`
- Group palette by `section_label` (Single Correct, More than one, Numerical, Matching List, Question Stem) using `test_questions.metadata.section_label` (new optional field).
- Show per-section instructions panel sourced from a new `tests.section_instructions jsonb` column (default to the official JEE Adv text from image 2 if empty).

### 4. Authoring + bulk import
- Update `BulkQuestionUploadDialog.tsx` (.docx importer) to recognise `[TYPE: mcq-multi-partial]`, `[TYPE: matching-list-4x5]`, `[STEM: id]` markers and section headers.
- Update `QuestionEditorDialog.tsx` to expose the new types with the correct +/-/partial defaults pre-filled.

## Verification plan
Before handing the platform back for 21-Jun:
1. Unit tests in `src/components/__tests__` (or new `src/test/scoring.test.ts`) covering each marking rule with fixtures from the attached images.
2. Seed a JEE-Adv mock paper with 1 question of each type and run an end-to-end attempt (browser tool) for: full correct, partial, zero, wrong, unanswered. Verify Grand Total = subject sum and response sheet renders correctly.
3. Simulate disconnect: in TestTakingPage, throttle network, kill tab, reopen — confirm all answers restored from snapshot + localStorage.
4. Admin: run `recompute_test_attempt` on a deliberately broken old attempt and confirm Excel-style fixes are now in-product.

## Technical notes
- Database changes are additive (new columns, replaced functions). No data loss.
- All new RPCs locked down: `submit_test_attempt` stays student-only; `recompute_test_attempt` requires `has_role(auth.uid(),'admin')`; `restore_attempt_from_snapshot` allowed for the owning student and admins.
- New edge function `attempt-beacon-save` accepts `sendBeacon` JSON, verifies JWT, and only updates its own attempt.
- No UI/branding change — just engine hardening + JEE Adv types.

## Out of scope (flag for later if needed)
- Live invigilation / face capture.
- Rank lists across both Papers combined into a single AIR (can be added once the paper_group_id ships).
