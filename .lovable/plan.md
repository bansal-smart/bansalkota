
# Live Test Platform — Phased Build Plan

Your existing setup already covers a meaningful slice: `tests` / `test_questions` / `test_attempts` tables, a `submit_test_attempt()` server-side scorer, a `TestTakingPage` (timer + palette + auto-save), `TestResultPage`, `TestSubjectBreakdownPage`, a `BulkQuestionUploadDialog`, a `QuestionEditorDialog`, and a KaTeX `MathRenderer`. The plan upgrades this incrementally instead of replacing it.

I am **not** building Institutes, Batches, Teacher/Question-Setter approval workflows, proctoring, AI generation, or payments here — they are out of MVP scope.

---

## Phase 1 — Live test surface on the Student Dashboard (small, ship first)

Goal: a student can see and join scheduled live tests from the dashboard.

- **`LiveTestsWidget`** on `StudentDashboard.tsx`: lists tests where `is_published = true` and `starts_at` is within ±N minutes, plus next 7 days upcoming. States: `Live now`, `Starts in 12 min`, `Upcoming`, `Missed`.
- **`/live-tests` page** (full list, filters by exam pattern + subject + status).
- **Instruction screen** (`/tests/:slug/instructions`) — marking scheme, palette legend, declaration checkbox, "Start test" button (disabled until `starts_at`).
- Reuse existing `TestTakingPage` for the attempt itself.
- Sidebar entry in `StudentLayout`: "Live Tests" with a red `LIVE` dot when one is active.

No DB schema changes in this phase — uses existing `tests.starts_at` / `ends_at`.

---

## Phase 2 — CBT screen upgrades (NTA parity)

Edits to `TestTakingPage.tsx` + a new `QuestionPalette` component:

- Subject tabs derived from `test_questions.subject`.
- 5 palette statuses with the exact NTA colors: Not Visited (grey), Not Answered (red), Answered (green), Marked for Review (purple), Answered & Marked for Review (purple + green dot). "Answered & marked" is still evaluated.
- Buttons: Save & Next, Save & Mark for Review, Mark for Review & Next, Clear Response, Previous, Next.
- Per-question `time_spent_seconds` tracking (added to `answers` JSON).
- Timer hardened: persisted `started_at`, recomputed on refresh; warn-on-unload; auto-submit on expiry (already partially present — verified and patched).
- Submit summary modal with answered / not answered / marked / answered+marked / not visited counts.
- Numerical-answer virtual keypad for numerical questions.
- Image zoom modal (click question/option image).

---

## Phase 3 — Question types & marking engine

Extend `test_questions` and the `submit_test_attempt` SQL function:

- Add columns: `marks_unanswered numeric default 0`, `partial_marking boolean default false`, `tolerance numeric`, `numerical_answer numeric`, `answer_format text` (`integer|decimal|range`), `option_images jsonb`, `solution_image_url text`, `passage_id uuid null`.
- New table `passages` (id, title, text, images, created_by) for comprehension parents.
- Question types supported in scorer: `mcq-single`, `mcq-multi` (with partial-marking rule), `numerical`, `integer`, `matrix-match`, `assertion-reason` (scored as single-correct), `passage-child` (delegates to inner type).
- `submit_test_attempt` rewritten as a dispatcher over `question_type`. All evaluation stays server-side so the client never sees `correct_answer` during the attempt.
- `marks_correct` / `marks_wrong` / `marks_unanswered` honored per-question (already partially supported).

---

## Phase 4 — Question Editor & Question Bank upgrades

Edits to `QuestionEditorDialog.tsx` and `AdminQuestionBankPage.tsx`:

- Type picker (single / multi / numerical / integer / matrix / assertion-reason / passage-child).
- Dynamic form per type (multi → checkbox list of correct options; numerical → answer + tolerance + format; matrix → row/col grid).
- Image uploads via existing `educator-uploads` bucket for: question body, each option, solution. Live preview with KaTeX.
- Bank filters: exam_pattern, subject, chapter, topic, type, difficulty, has_image, status, import source.
- "Add to test" action (writes a `test_questions` row from a bank question).

---

## Phase 5 — Word (.docx) bulk upload with images

Rewrite `BulkQuestionUploadDialog.tsx` and add `src/lib/docxQuestionParser.ts`:

- Use `mammoth` (HTML + image extraction) on the client.
- Parse both formats listed in the brief: paragraph-style (`Q1. [Single Correct] … Answer: B … Solution:`) and table-style.
- Detect type tags (`[SCQ]`, `[Numerical]`, `[Multi]`, `[Matrix]`, `[Passage]`, `[AR]`).
- Extract embedded images, upload to `educator-uploads`, and bind to the right slot (question body / option A-D / solution / passage) based on positional order within the question block.
- Preview table with per-row validation (missing answer, bad marks, image bind failed, unknown type → "Needs review"), inline fix, then "Import N questions" inserts into `test_questions` (or `question_bank` if a test isn't selected).

Excel/CSV upload reuses the same preview/validate/commit pipeline via `xlsx` (already in deps if present, else add).

---

## Phase 6 — Result, analytics & re-evaluation

- `TestResultPage`: add accuracy, time taken, rank (already computed via `percentile`), per-question review row with Your Answer / Correct / Marks / Solution (uses `get_test_question_answers` RPC, already exists).
- New RPC `reevaluate_test(_test_id)` — admin can update a question's `correct_answer` / mark it dropped / set bonus, then trigger recompute of all submitted attempts. Adds `is_dropped boolean`, `bonus_marks numeric` to `test_questions`.
- `AdminTestsPage`: result-visibility toggle, solution-visibility toggle, "Recompute results" button, rank list export (CSV).

---

## Technical notes

- Stack stays React + TS + Tailwind + Lovable Cloud (Supabase). No new framework.
- All scoring stays in Postgres SECURITY DEFINER functions — never trust client.
- Images live in existing `educator-uploads` bucket; URLs stored on rows.
- KaTeX (`MathRenderer`) already wired — used in question, options, solution, passage.
- Migrations: ~2 (Phase 3 schema + Phase 6 re-eval); GRANTs included for every new column/table.

---

## Out of MVP (will not build now, can be added later)

Institutes / batches / teacher-setter approval workflow, proctoring, AI generators, payments/subscription, parent reports, WhatsApp alerts, mobile app, SVG-as-image, video solutions.

---

## What I need from you before coding

1. **Start with Phase 1 only?** (dashboard widget + live-test list + instruction screen — ~1 short build) or **bundle Phase 1+2** (also upgrade the CBT screen)?
2. **Which question types are must-have for v1?** Default I'll ship: single, multi (with partial), numerical, integer. Matrix-match + passage + assertion-reason can come in a follow-up.
3. **Word upload priority** — needed in this round, or after the live-test surface is verified? It's the heaviest single piece (≈ half of the total work).

Reply with picks (e.g. "Phase 1+2, all 4 types, Word later") and I'll implement.
