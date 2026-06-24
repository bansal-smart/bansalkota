## Goal

Make the "Wall of Fame" on `/achievements` driven by the existing `toppers` table, ensure the Admin → "Toppers" tab is the place to add/edit/delete entries, and bulk-import the 332 students from `TOPPERS.xlsx`, sorted rank-wise.

## What we have today
- `toppers` table already exists (name, exam, rank_label, year, sort_order, is_published, photo_url, quote, city, …) with admin + public-read RLS.
- `/admin/toppers` page (`AdminToppersPage`) already supports create / edit / delete / publish + a CSV bulk dialog and Toppers/Alumni view toggle.
- `/achievements` `The Wall of Fame` grid currently renders from a hardcoded `TOPPERS[]` array — this is what we need to switch over.
- Uploaded file: 332 rows → 331 `JEE ADVANCED` + 1 `JEE MAIN`; columns `COURSE, NAME, AIR, YEAR`.

## Plan

### 1. Seed the database from the XLSX (one-time data import)
- Parse `TOPPERS.xlsx` and insert all 332 rows into `public.toppers`:
  - `name` ← title-cased NAME
  - `exam` ← "JEE Advanced" / "JEE Main"
  - `rank_label` ← `AIR <n>`
  - `year` ← YEAR
  - `sort_order` ← AIR number (so ORDER BY sort_order ASC = rank-wise; ties broken by year desc, then name)
  - `is_alumni = false`, `is_published = true`
- Skip duplicates using the existing `(name, exam, year)` unique key.

### 2. Make `/achievements` Wall of Fame dynamic
- In `src/pages/AchievementsPage.tsx`:
  - Replace the hardcoded `TOPPERS[]` with a query against `toppers` (via the existing `useToppers` hook or a small inline query) ordered `sort_order ASC, year DESC, name ASC`.
  - Filters at the top become dynamic — derived from distinct `exam` values present in DB (so JEE Advanced / JEE Main show up automatically; KVPY/NTSE only appear if data exists).
  - Keep the same card visual: avatar (initials when no `photo_url`), name, exam, rank label as the AIR pill, year badge, optional quote.
  - Show a "Load more" (paginate ~24 per page) since 332 cards is too many to render at once.
  - Empty/loading skeleton state.

### 3. Admin "Topper Student" tab
- The Admin sidebar already links to `/admin/toppers`. Rename that nav label from "Toppers" to "Topper Students" so it matches the user's wording, and make sure it's reachable for super_admin (it already is via the existing route).
- No structural change to the admin page itself — it already supports add / edit / delete / publish, the existing bulk CSV importer stays available for future uploads, and the "Toppers" view filter is preserved.

### 4. Sorting contract
- All listings (admin grid + Wall of Fame) standardize on `ORDER BY sort_order ASC, year DESC, name ASC`, so AIR 1 always renders first.

## Technical notes (devs only)
- No schema migration needed — `sort_order INT` already exists on `toppers`.
- Bulk import is a data-only `INSERT … ON CONFLICT (name, exam, year) DO NOTHING` against the existing unique index, done via the data-insert tool from a parsed XLSX.
- `useTopToppers` (landing) and `useToppers` (achievements) both already point at the `toppers` table; the landing strip will start showing the imported AIR 1 / AIR 2 stars automatically once data is in.
- Sidebar label change is in `src/components/AdminLayout.tsx` only.
