## Why some cards lack the top-left badge

On `/courses` the top-left pill over the thumbnail renders `c.badge` from the database, and only when it's set. Cards whose `badge` column is empty (e.g. Sterling NEET XIII Dropper) show no pill. Separately, every card already has a guaranteed Online/Offline/Residential chip below the thumbnail computed by `detectMode(c)` from name/badge/description keywords.

## Fix

In `src/pages/CoursesPage.tsx`, replace the conditional `c.badge` overlay (both the `thumbnail_url` and fallback branches, lines ~222 and ~231) with an always-rendered mode badge using the same `detectMode(c)` helper already used below.

- Pill text: `Online` / `Offline` / `Residential` (from `detectMode`).
- Include the matching `modeIcon` (Video / MapPin / Home) inside the pill for consistency with the lower chip.
- Keep the existing pill styling (white background, rounded-full, top-3 left-3, shadow).
- No DB/schema changes; no other pages touched.

Result: every course card — regardless of whether `badge` is populated in the DB — shows an Online/Offline/Residential badge in the top-left corner of the thumbnail.