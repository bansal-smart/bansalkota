## Phase 1 — Centre & Admin Panel Enhancements

Scope is the Centre/Admin batch only. Website items (Sameer Sir, Alumni, single-device login, leadership photos, auto-confirmation messages) come in Phase 2.

### 1. Bulk Import / Export (CSV)
- New reusable `BulkIO` dialog (extend existing `BulkCsvDialog`) supporting both import and export, with template download, validation preview, row-level error reporting, and dry-run.
- Wire into:
  - Centres (`centers`) — admin only
  - Students (`profiles` + `user_roles`) — admin + centre admin (scoped to own centre)
  - Centre courses (`center_courses`) — admin + centre admin
  - Centre support / enquiries (`center_course_enquiries`) — export only
- Export = current filtered list → CSV/XLSX download.
- Import = CSV upload → parse → validate → confirm → batched insert via edge function (`bulk-import`) using service role to respect RLS-safe writes; idempotent on a natural key (centre code, roll number, course slug).
- Used as the path for migrating old admin-panel student data (user uploads CSV exports).

### 2. Centre Login Credentials in Centres tab
- New column "Login" in `AdminCentersPage` table per centre showing:
  - Centre login email/username (from `center_staff` joined to `auth.users`)
  - "Reset password" action (admin RPC `admin_reset_center_password` → edge function using service role)
  - "Copy credentials" + "Send via email" (queues an app email with the new temp password)
- "Add centre login" inline dialog: creates auth user, inserts `center_staff` row (existing trigger grants `center_admin` role).

### 3. Alphabetical Centre Ordering (Kota pinned)
- All public + admin centre lists ordered by `(is_pinned DESC, name ASC)`.
- Add boolean `is_pinned` to `centers` (default false). Seed Kota centre `is_pinned = true`.
- Apply in: landing page centre showcase, `/centres` list, dropdowns, footer.

### 4. "Centre" Terminology Rename (everything)
Full British spelling across UI text, routes, components, and DB.

- **Routes**: `/admin/centers` → `/admin/centres`, `/centers/:slug` → `/centres/:slug`, etc. Keep 301-style client redirects from old paths for 1 release.
- **Components/files**: `AdminCentersPage` → `AdminCentresPage`, `CenterStudentsPage` → `CentreStudentsPage`, `CenterPortal*` → `CentrePortal*`, etc.
- **DB migration**: rename tables and columns:
  - `centers` → `centres`
  - `center_staff` → `centre_staff` (col `center_id` → `centre_id`)
  - `center_courses` → `centre_courses`
  - `center_banners`, `center_gallery`, `center_updates`, `center_course_enquiries` → `centre_*`
  - `profiles.center_id` → `centre_id`
  - All functions referencing these (`is_center_staff`, `is_any_center_staff`, `grant_center_admin_role`, `revoke_center_admin_role`, triggers) updated.
  - Regenerate types; sweep `rg "center"` to update every reference.
- Risk: large blast radius. Will be done in a single migration + matched code sweep, verified by build.

### 5. Centre-Level Management (scoped admin)
- Centre admins (existing `center_admin` role via `center_staff`) get a Centre Portal section to:
  - Manage their students: list (scoped to `profiles.centre_id`), edit status (active/inactive/passed-out), assign batch, bulk import/export (their centre only).
  - Manage their courses: CRUD on `centre_courses` filtered by their centre.
- Enforce via RLS policies using `is_center_staff(auth.uid(), centre_id)` (renamed function).

### 6. Per-Centre Gallery
- `centre_gallery` already exists. Build out:
  - Centre admin UI: upload images (storage bucket `centre-gallery`), caption, category (Achievement / Event / Activity / Other), order index, publish toggle.
  - Public page: `/centres/:slug/gallery` with masonry grid + lightbox.
  - Link from each centre page.

### 7. Centre Updates & News
- `centre_updates` already exists. Build out:
  - Centre admin UI: rich-text post (title, body, cover image, pin, publish_at).
  - Public page: `/centres/:slug/updates` feed + detail view `/centres/:slug/updates/:slug`.
  - Surface latest 3 on the centre's main page.

### 8. Reposition Centre Details
- On `/centres/:slug` reorder sections to: Hero → Highlights/Stats → Courses → Faculty → Gallery → Updates → Testimonials → **Centre Details (address, contact, map, timings) at the bottom**.

### 9. Old Admin Panel Migration (Students + other data)
- Confirmed source: CSV/Excel exports.
- Deliverables in this phase:
  - Documented CSV templates for: students, centres, centre courses, enrollments, enquiries.
  - Bulk-import endpoint handles each template with validation + dry-run + error CSV download.
  - Idempotent upserts so re-imports are safe.
- Actual data load happens when the user uploads the files.

### Technical notes
- Storage: new bucket `centre-gallery` (public read, centre-staff write via RLS).
- Edge function `bulk-import`: validates JWT, checks role/centre scope, performs batched upserts in transactions; returns per-row results.
- All new tables/columns include GRANTs + RLS.
- Single big "centre" rename migration runs first; all subsequent feature code uses new names.

### Out of scope (Phase 2)
Sameer Sir About update + books, Alumni page, single-device login (soft, last-login-wins via `active_sessions`), leadership photo refresh, automated post-submission confirmation emails.

### Suggested build order
1. DB rename migration (`center*` → `centre*`) + code sweep + redirects.
2. `is_pinned` + alphabetical ordering.
3. Bulk import/export framework + centres + students.
4. Centre login credentials UI.
5. Centre-scoped student & course management.
6. Gallery + Updates features.
7. Centre page layout reorder.
8. Bulk import for remaining datasets (courses, enquiries, enrollments).
