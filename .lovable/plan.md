## 1. Fix course reorder across pages

Problem: drag-and-drop on `AdminCoursesPage` only works within the current page because the `SortableContext` is built from `paged` (15 per page) — you can't drag a row from page 2 onto page 1.

Fix:
- Add a "Reorder mode" toggle on `AdminCoursesPage`. When ON, pagination is bypassed and the full list renders so any row can be dragged to any position. When OFF, the paginated table is shown (current behavior).
- While in reorder mode the search input is disabled (same constraint as today) and a clear hint is shown.
- An alternative I considered — move-to-position number input per row — is more clicks for the user; the reorder toggle is closer to today's UX and works for 50–100 courses without performance issues.

## 2. Test Series — full create/edit page + edit button

Today: `AdminTestSeriesPage` has only an inline "Add" form and a list (no edit, minimal fields, no rich description, no detail page parity with courses).

Changes:
- New page `src/pages/CreateTestSeriesPage.tsx` modeled on `CreateCoursePage`, with sticky save bar and these fields:
  - Cover image (uploaded to existing `site-content` / `educator-uploads` bucket, 4:3)
  - Title, slug (auto from title, editable)
  - Short description (textarea, no length limit)
  - Detailed description — `RichTextEditor` (TipTap, tables) saved to a new `description_html` column on `test_series`
  - Target exam (dropdown using existing `useExams`), Subject
  - Total tests, Duration (months)
  - Sale price (`price`) and MRP (`original_price`) — auto-computes `discount_percent`
  - Features chip input (saved into existing `features text[]` column)
  - "This series includes" checklist (saved into a new `included_services text[]` column, reusing `SERVICE_OPTIONS` from `CourseDetailPage`)
  - Language, mode (saved into new `language` / `mode` text columns)
  - Published / Featured toggles
- Routes: `/admin/test-series/new` and `/admin/test-series/:id/edit` (rendered inside `AdminLayout`).
- `AdminTestSeriesPage` list:
  - Replace the inline add form with a "New Test Series" button that links to `/admin/test-series/new`.
  - Add a pencil **Edit** button to every row → `/admin/test-series/:id/edit`.
  - Add a cover thumbnail column.
- Update `TestSeriesDetailPage` to render the new `description_html` (via `dangerouslySetInnerHTML` + `prose` classes) and the included-services row, matching the course detail layout.
- Migration: add columns `description_html text`, `included_services text[] default '{}'`, `language text`, `mode text`, `cover_url text`, `sort_order int default 0` to `test_series` (sort_order reserved for future ordering; not required by this task but cheap to add now).

## 3. Books — drag & drop sorting (cross-page)

- Add a `sort_order int default 0` column to `books` via migration; backfill `sort_order = row_number()` ordered by `created_at desc` so existing order is preserved.
- Update `useBooks`/`useFeaturedProducts` and public `EStorePage` queries that touch books to order by `sort_order asc, created_at desc`.
- In `AdminBooksPage` `BooksTab`:
  - Wrap the list in `DndContext` + `SortableContext` with `@dnd-kit` (same pattern as `AdminCoursesPage`).
  - Add a grip column with `useSortable` per row; on drag-end, recompute `sort_order` and batch-update Supabase.
  - Add the same "Reorder mode" toggle as Courses so admins can drag across pages, plus a small hint line.
  - Order the initial load by `sort_order asc, created_at desc`.

## Technical notes
- DB changes go through one migration (`test_series` columns + `books.sort_order` + backfill). `service_role` and `authenticated` already have privileges on both tables.
- Public `test_series` and `books` reads use existing RLS (published rows) — no policy changes needed.
- New `CreateTestSeriesPage` reuses `RichTextEditor`, `useExams`, and the `SERVICE_OPTIONS` exported from `CourseDetailPage` to avoid duplicated config.
- No changes to the test engine, enrollment, or payment flows.

## Files touched
- `supabase/migrations/<new>.sql` — add columns + backfill
- `src/pages/AdminCoursesPage.tsx` — reorder toggle, render full list in reorder mode
- `src/pages/CreateTestSeriesPage.tsx` — new
- `src/pages/AdminTestSeriesPage.tsx` — list refactor (cover, edit button, link to new page, drop inline form)
- `src/pages/TestSeriesDetailPage.tsx` — render description_html + included services
- `src/hooks/useTestSeries.ts` — include new columns
- `src/pages/AdminBooksPage.tsx` — DnD + reorder toggle
- `src/hooks/useBooks.ts`, `src/hooks/useFeaturedProducts.ts`, `src/pages/EStorePage.tsx` — order by sort_order
- `src/App.tsx` — register `/admin/test-series/new` and `/admin/test-series/:id/edit` routes (replace the current redirect)
