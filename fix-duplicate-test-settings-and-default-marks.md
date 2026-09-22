# Bug: Duplicate Test doesn't copy test-level settings + new questions don't inherit default marks

## Context
Two related gaps in the Test Platform, reported after using the live "Duplicate test" feature
(the copy icon in the Actions column on `/admin/tests-hub?tab=all`):

1. **Duplicate Test copies questions correctly, but not the test's own settings.** Per the
   client: "it work completely fine but it didn't copy the test settings like test marks and
   everything." The questions and their individual marks DO come through correctly on
   duplication — but test-level settings (whatever that actually includes — likely the marking
   scheme defaults, negative marking rule, shuffle setting, duration, instructions text, exam
   mode, etc.) are not being copied to the new draft.

2. **Newly added questions don't inherit the test's default marks.** When adding a *new* question
   to a test (via the Question Bank picker/drag-and-drop on the Create/Edit Test page — whether
   on a fresh test or a duplicated one), that question comes in without the test's configured
   default marking scheme applied (e.g. if the test is set to +4 for correct / -1 for incorrect,
   a newly added question should automatically get +4/-1, not blank/zero marks requiring manual
   entry every time).

## What I need you to do

### 1. Find every field that constitutes "test settings" first
- Look at the `tests` (or equivalent) table schema and the Create/Edit Test page's "Test Details"
  section (Test Mode, Shuffle questions per student, marking scheme/default marks per question,
  negative marking, duration, instructions text, exam mode settings from the earlier dual
  Kiosk/Digital mode feature, End-Test Date/schedule settings from the earlier CBT feature, etc.)
  to build a complete, accurate list of what "test settings" actually means in this codebase —
  don't guess at a partial list.

### 2. Fix Duplicate Test to copy ALL of these settings
- Find the duplicate/copy test handler (built in the earlier "Duplicate test" feature).
- Confirm exactly which fields it currently copies (question set + per-question marks, per the
  client's confirmation) and which it's currently leaving at default/blank instead of copying from
  the source test.
- Fix it to copy every field identified in step 1, with the same exceptions already correctly
  established in that feature (per the original duplicate-test design: the copy must still always
  be created as **Draft**, never auto-published, and should still get a distinguishable name like
  appending "(Copy)" — don't undo those parts, they were intentional).

### 3. Make newly added questions inherit the test's default marking settings
- Find where a question gets added to a test (the "+ Add" action from the Question Bank panel
  shown on the Create/Edit Test page, and drag-and-drop if that's a separate code path).
- Find where a question's individual marks (correct/incorrect marks) are currently set when added
  — confirm whether this is currently defaulting to 0/blank, or to some hardcoded default
  unrelated to the test's own configured marking scheme.
- Change this so that when a question is added to a test, its marks are automatically pre-filled
  from that test's own default marking scheme setting (whatever field holds this, per step 1) —
  while still allowing the admin to manually override an individual question's marks afterward if
  they want an exception for that specific question.
- Apply this consistently regardless of how the test was created — a brand new test, or a
  duplicated one — since the client's report implies this gap exists in both cases.

### 4. Verify
- Duplicate an existing published test with a non-trivial marking scheme (e.g. +4/-1) and confirm
  the new draft copy has the identical settings, not just identical questions.
- On a test with a configured default marking scheme, add a brand-new question from the Question
  Bank and confirm it comes in with the correct marks pre-filled, not blank/zero.
- Confirm manually overriding an individual question's marks after it's added still works and
  isn't fought by this new default-filling behavior.
- Re-run `tsc --noEmit` and `npm run build` to confirm no regressions to the existing, working
  question+marks duplication behavior.

## Deliverable
- Duplicate Test now copies the complete set of test-level settings, not just questions and their
  marks.
- Any question added to a test (new or duplicated) automatically inherits that test's default
  marking scheme, with manual override still available per question.
