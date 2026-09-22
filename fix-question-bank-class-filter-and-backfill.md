# Follow-up: Add Class filter to Question Bank + re-examine "batch codes too inconsistent to parse"

## Context
Following the Class/Stream/Test Type backfill work: Stream and Test Type are now largely
populated, but Class is still 0 for every row. Your stated reason was that batch codes (e.g.
`XI-J1`, `XIII-V2`) are "too inconsistent to auto-parse safely."

Looking at the actual live batch list on the Create Test page ("Select batches below"), the
pattern is clearer than that framing suggests:

```
BOOST-IX, BOOST-V, BOOST-VI, BOOST-VII, BOOST-VIII, BOOST-X,
BOOST-XI-E, BOOST-XI-M, BOOST-XII-E, BOOST-XII-M, BOOST-XIII-E, BOOST-XIII-M,
DE-JEE, DE-NEET, demo, J-XI, J-XII, J-XIII, M-XI, M-XII, M-XIII, NEET-TS, VI
```

Most of these end in a clean Roman-numeral class suffix (`IX`→9, `V`→5, `VI`→6, `VII`→7,
`VIII`→8, `X`→10, `XI`→11, `XII`→12, `XIII`→13/dropper) — sometimes with a trailing stream letter
(`-E` for Engineering, `-M` for Medical) that doesn't affect the class parse. Only a handful
(`DE-JEE`, `DE-NEET`, `demo`, `NEET-TS`) don't fit this pattern.

## What I need you to do

### Part 1: Add a Class filter to the Question Bank
- Add a "Class" filter dropdown to the Question Bank page, alongside the existing
  Subject/Topic/Difficulty/Stream/Test Type filters.
- Values, per the actual client requirement:
  - JEE/NEET stream: **XI, XII, XIII**
  - Foundation stream: **IV, V, VI, VII, VIII, IX, X**
- Filter behavior should combine with the existing filters (AND logic), same pattern as the rest
  of this filter bar.

### Part 2: Re-examine the batch-code parsing claim with the real data in front of you
- Don't take the earlier "too inconsistent" conclusion as final — re-derive it against the actual
  batch code list shown above (pull the full, real list of batch codes from `course_batches`,
  not just what's visible in one screenshot, in case there are more edge cases not shown here).
- Write a parser that extracts a class value from the **trailing Roman numeral** in a batch code
  (handling the optional `-E`/`-M`/similar stream-letter suffix after the numeral), and test it
  against every distinct real batch code in the database.
- Report concretely: what fraction of batch codes parse cleanly and unambiguously with this
  approach, and which specific codes don't (e.g. `demo`, `DE-JEE`, `NEET-TS`, or others found in
  the full list) — a real number, not a general impression.
- For codes that DO parse cleanly: use this to backfill `class` on question bank rows the same way
  Stream/Test Type were backfilled (join back through `import_batch_id` → `test_questions` →
  `tests` → the batch(es) that test was scoped to, per the "Filter by Centre... Select batches
  below" mechanism visible on the Create Test page).
- For codes that genuinely don't parse (confirm the real, final list) — leave those rows
  unclassified rather than guessing, exactly as you correctly did for the BOOST/no-test-origin
  rows in the previous round. If a test was scoped to multiple batches spanning different classes
  (e.g. a test open to both `J-XI` and `J-XII`), do NOT arbitrarily pick one — leave `class` null
  for those specific ambiguous cases and report how many rows this affects.

### Part 3: Wire the same defaulting pattern as Stream/Test Type going forward
- Since `CreateTestPage.tsx` already scopes a test to specific batches (visible in the "Select
  batches below" UI), and those batch codes now have a reliable class-parsing method, pass a
  derived default Class value into the Word-import/Common-import dialogs the same way
  `defaultTestType` and the stream default already work — so future imports don't end up
  unclassified the same way Stream/Test Type did before your last fix.
- If a test spans multiple classes' batches (ambiguous case from Part 2), don't guess a default —
  leave the Class picker unset/require manual selection for that case specifically, same principle
  as the bulk-backfill.

### Verify
- Confirm the new Class filter works correctly on the Question Bank page.
- Report the real before/after count: how many of the ~7,243 existing rows now have Class
  populated via the batch-code backfill, versus how many remain genuinely unclassified and why.
- Confirm `tsc --noEmit` and `npm run build` stay clean.

## Deliverable
- Class filter added to Question Bank (JEE/NEET: XI–XIII; Foundation: IV–X).
- A real, data-driven answer on whether batch codes are parseable for class (they appear to be,
  for most codes) — with an actual backfill applied where they are, and honest, specific
  unclassified counts where they genuinely aren't (not a blanket "too inconsistent" without
  numbers).
- Future test creation/import correctly defaults Class the same way Stream/Test Type now do,
  where the batch scope makes that unambiguous.
