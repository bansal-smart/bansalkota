## Fix student result & solution PDF access on `/my-tests`

**Root cause:** `TestListPage.tsx` shows CBT tests to any batch student once results are released — including students who never attempted (were absent). Rows with no attempt fall through to `/tests/:slug/instructions`, which is not applicable to CBT (a centre-run kiosk test).

**Aditya's data confirms:** his 2 attempts are `submitted` / `auto_submitted` with `results_released_at` set. Those should already route to the result page. Other CBT rows in his batch he didn't attempt cause the wrong redirect.

### Changes

**1. `src/pages/TestListPage.tsx`**
- For CBT tests without an attempt for this user, render the row as **non-clickable** with an **"Absent — No Result"** badge (grey pill, cursor default) instead of a `<Link>` to `/instructions`.
- CBT tests with a submitted attempt continue to link to `/tests/:slug/result/:attemptId` with the existing "View Result" badge.
- Non-CBT tests keep current behavior (instructions → take → result).

**2. `src/pages/TestResultPage.tsx`** — ensure both PDFs are prominent for the student
- Keep the existing **Download Scorecard PDF** action (already implemented via `generateScorecardPdf`).
- The **Download Solution PDF** button already renders when `results_released_at && solution_pdf_path` are set (creates a signed URL on `test-solutions` bucket). Verify it's visible for students — no policy change needed; just group the two buttons together in a clear "Downloads" row near the top of the result summary so it's obvious.
- No schema or RLS changes.

### Files touched
- `src/pages/TestListPage.tsx` — conditional render for CBT-without-attempt rows.
- `src/pages/TestResultPage.tsx` — small UI grouping so Scorecard + Solution buttons sit side-by-side and are visible above the fold.

### Verification
- Log in as Aditya (roll 261108) via Playwright, open `/my-tests`, confirm:
  - Both attempted CBT tests show "View Result" and open the result page.
  - Any other CBT rows in his batch show "Absent — No Result" and are not clickable.
  - On the result page for `ST-01_13th_28-06-2026_JEE [Adv.]` both **Download Scorecard** and **Download Solution PDF** buttons appear and produce files.
