# Combined Result (Paper 1 + Paper 2)

Adds a "Combined Result" flow on the admin test result page so admins can merge any two tests (typically JEE Advanced Paper 1 & Paper 2) into a single ranked sheet — without changing the existing individual result view.

## 1. Entry point

On `AdminTestResultPage.tsx`, next to **Excel / Submit pending / Master Result PDF**, add a new button:

- **Combine with…** → opens a dialog listing other tests (same exam/category, ordered by date desc, searchable).
- Admin picks the partner test → navigates to `/admin/tests/<base-id>/combined?with=<partner-id>`.

No schema changes, no persistent link — purely an on-demand merged view. Admin can re-pick a different partner any time.

## 2. New page: `AdminCombinedResultPage.tsx`

Route: `/admin/tests/:testId/combined?with=<partnerId>`

Loads both tests' attempts + students in parallel, merges in memory, renders the same visual style as the existing result page.

### Columns

```
RANK(P1) | RANK(P2) | RANK(COMBINED) | ROLL NO | NAME | BATCH |
PHYSI 1 | PHYSI 2 | PHYSI TOT |
CHEMI 1 | CHEMI 2 | CHEMI TOT |
MATHE 1 | MATHE 2 | MATHE TOT |
TOTAL 1 | TOTAL 2 | GRAND TOTAL | %AGE | VIEW | EXCLUDE
```

Subject columns are derived dynamically from the union of subjects in both papers (so it also works for any 2-test combination, not just JEE Adv).

### Student matching & display rules (per user feedback)

- Match by **profile roll_no** (fall back to user_id when roll absent).
- Union of all students from both papers is shown.
- For any paper a student did not attempt, that paper's subject cells and `TOTAL n` show **"Absent"** (greyed), and their other paper's marks display normally.
- `GRAND TOTAL` = sum of attempted paper(s) only; `%AGE` = grand total ÷ (max marks of attempted papers only) — so a single-paper student isn't unfairly diluted.

### Ranking (side-by-side)

- `RANK(P1)` — rank within Paper 1 attendees only.
- `RANK(P2)` — rank within Paper 2 attendees only.
- `RANK(COMBINED)` — rank by `GRAND TOTAL` desc across the full union; single-paper students participate using their one-paper total.
- Ties: dense rank (same as existing logic).
- ABS-in-both / IT-test rows excluded from ranking, shown at the bottom like the current page.

### Footer aggregates

MAX / MIN / AVG rows reproduced for every numeric column (per-paper subjects, per-paper totals, and grand total), matching the current page's footer style.

### Actions reused

- **Excel** export — same shape as new columns.
- **Master Result PDF** — combined layout (subject 1 / 2 / total triplets).
- **Exclude** — toggling exclusion on combined view excludes that student from the combined ranking only (uses existing `test_result_exclusions` keyed per-test for the underlying papers; for the combined view we keep a local in-memory exclusion list, no DB change).
- **VIEW** opens the student's response sheet of whichever paper(s) they attempted (dropdown if both).
- **Release / Back-release / Submit pending** are *not* duplicated here — those remain on each individual test's page.

## 3. Implementation notes

- No DB migration. Pure frontend aggregation on top of existing `test_attempts`, `tests`, `test_questions`, `profiles` queries.
- Reuse helpers from `AdminTestResultPage.tsx` (subject grouping, rank computation, formatINR-free numeric formatters) — extract them into `src/lib/tests/resultAggregation.ts` so both pages share logic without divergence.
- Partner test selector: query `tests` where `exam_id = base.exam_id` and `id != base.id`, ordered by `starts_at desc`, limit 50, with search.
- URL is shareable; reloading restores the same combined view.

## 4. Files touched

- `src/pages/AdminTestResultPage.tsx` — add "Combine with…" button + partner-picker dialog.
- `src/pages/AdminCombinedResultPage.tsx` — **new**, the combined view.
- `src/lib/tests/resultAggregation.ts` — **new**, shared subject/rank helpers extracted from the existing page.
- `src/App.tsx` — register the new route.

## Out of scope

- Persistent "test group" entity.
- Combining 3+ papers.
- Release/SMS for combined results (releases stay per-paper).
