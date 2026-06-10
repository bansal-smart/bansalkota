# Live Test Platform — Progress

## ✅ Phase 1 — Live test surface (shipped)
- `LiveTestsWidget` on Student Dashboard (live + 7-day upcoming, status badges).
- `TestInstructionsPage` at `/tests/:slug/instructions` (marking scheme, palette legend, declaration, countdown, Start).
- TestListPage now routes through instructions (resume still goes direct).

## ✅ Phase 2 — CBT screen NTA parity (shipped)
- Subject tabs derived from question subjects.
- Five-state palette with NTA colors (emerald/red/violet, "answered + marked" ringed in green).
- Per-question `time_spent` tracking baked into answers JSON.
- Numerical/integer virtual keypad.
- Image zoom modal (click question image).
- Submit-summary modal with full counts.
- Save & Mark, Mark & Next, Clear Response, Previous, Save & Next.
- Warn-on-unload + auto-submit at timer expiry.

## ✅ Phase 3 — Marking engine + schema (shipped)
- New `test_questions` columns: `marks_unanswered`, `partial_marking`, `tolerance`, `numerical_answer`, `answer_format`, `option_images`, `solution_image_url`.
- `submit_test_attempt` rewritten as a Postgres dispatcher over `question_type`:
  - **mcq-single / assertion-reason**: exact match.
  - **mcq-multi**: exact = full; any wrong = wrong marks; subset + `partial_marking` = proportional credit.
  - **numerical / integer**: numeric compare with `tolerance`.
- `get_test_question_answers` returns `numerical_answer`, `question_type`, `tolerance` for review.
- `CreateTestPage` author UI extended: per-question type picker, multi-select correct, partial-marking toggle, numerical answer + tolerance, integer-only input.

## ⏳ Phase 4 — Question bank editor parity (pending)
- Mirror the new authoring fields in `QuestionEditorDialog` (currently writes only mcq-single to `question_bank`).
- Question bank filters by type/difficulty/has-image/import-source.

## ⏳ Phase 5 — Word (.docx) bulk import with image extraction (pending — heaviest piece)
- `mammoth` parse, paragraph + table format, type-tag detection, image binding, validate-edit-commit preview, Excel/CSV branch.

## ⏳ Phase 6 — Review, analytics, re-evaluation (pending)
- Per-question review page (your answer / correct / marks / solution) for all types.
- `reevaluate_test()` RPC, drop/bonus on questions, recompute, result-visibility toggle, rank CSV export.

## Out of scope (not building unless asked)
Institutes, batches, teacher-setter workflows, proctoring, AI generators, payments, parent reports, mobile app.
