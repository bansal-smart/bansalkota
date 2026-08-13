# Bansal Classes Platform — Context

An education platform (Vite + React + TypeScript + Supabase) for Bansal Classes: a
public marketing site, a student learning app, and an admin back office (super-admin,
admin, and centre-admin all operate within/around it). This document captures the
shared language of the domain so changes stay consistent.

> Updated 2026-07-07 after two major changes: (1) a cleanup that removed teacher/
> mentor roles, doubt-solving, and the standalone centre portal, and unified the two
> duplicate custom-role systems; (2) a franchise/multi-centre restructure (Phase 1:
> data model + super-admin features; Phase 2: **centre_admin merged into `/admin/*`**
> rather than a separate portal — see "Centre admin portal" below).

## Actors & Roles

The app resolves **one primary role per user** (`AuthContext.resolveRoleFromServer`),
by priority: `super_admin` > `admin` > `center_admin` > `student`. Server-verified via
the `has_role` security-definer RPC against `user_roles`.

- **Super Admin** (`super_admin`) — top tier. Full access to `/admin/*`, including
  revenue, settings, refunds, and the only one who can create/edit **roles** (see
  below). Always bypasses custom-role permission checks.
- **Admin** (`admin`) — staff back-office user under `/admin/*`. Full access *unless*
  a custom admin role is assigned (then gated per-module by `has_permission()`).
- **Centre Admin** (`center_admin`) — manages one Bansal **centre**. Granted
  automatically by a DB trigger when a `centre_staff` row is inserted. Signs in at
  `/admin/login` and lands in the **same `/admin/*` portal** as admin/super_admin, but
  `AdminLayout` shows them a **fixed 9-tab subset** ("My Centre" nav group) instead of
  the general admin menu — see "Centre admin portal" below.
- **Student** (`student`) — default role; the main learning app.

**Removed entirely (2026-07-06):** `teacher` and `mentor` roles, the teacher portal
(`/teacher/*`), doubt-solving (`doubts`/`doubt_answers` tables, `/doubts`,
`ai-doubt-solver`), the public `/educators` page, and the old `/center/*` portal UI
(pages deleted; DB tables/RLS for centre data remain, portal will be rebuilt).
`teacher`/`mentor` remain as unused values in the `app_role` Postgres enum (Postgres
can't drop enum values in place cheaply; harmless since nothing assigns them anymore).

## Multi-Centre / HQ model (in design, 2026-07-06)

Bansal runs on a **franchise model**: independent operators buy a Bansal franchise and
run a **centre** individually. One centre is special:

- **HQ** — the **Kota** centre (`centres.is_hq = true`). Unique privileges: it is the
  only centre allowed to create **global online courses** (sold to anyone) and it also
  owns all the platform's pre-existing data (see below). HQ can create online + offline
  content of every kind.
- **Franchise centre** — every non-HQ centre. Runs independently: creates its **own
  offline** courses, tests, and test series for its own students. **Cannot** create or
  sell online courses (online is HQ-only). Whenever this doc says "centre" as distinct
  from HQ, it means a franchise centre; **Kota HQ is the exception to centre rules.**

**Content ownership & visibility (resolved):**
- All content (courses, tests, test series, batches, gallery, students) is owned by a
  centre via a `centre_id`. Existing/pre-restructure data is backfilled to **Kota HQ**
  (no data deleted — just associated).
- Three content scopes: **global** (HQ-created, visible to every franchise student),
  **centre-local** (created by a centre — incl. Kota — for its own students only), and
  other centres' local content (never visible). HQ can **optionally flag** a course /
  test / test series as global via an **`is_global`** flag; unflagged HQ content is
  Kota-local. **Online courses are always global** and are the only courses sold in the
  public e-store. **Franchise courses are offline-only, centre-local, and assigned by
  the centre (never sold online).** "Global batches" means HQ owns the standard
  batch-code scheme every centre uses — not shared batch rows.
- A **franchise student sees**: their own centre's local content + all HQ-global
  content. They do **not** see Kota-local content or other franchises' content.
- `courses.mode` (Online/Offline/Hybrid/Residential) stays a descriptive display label;
  access/visibility is driven by `centre_id` + `is_global`, not by `mode`.

**Gallery scope (resolved):** the global `gallery_albums` (public `/gallery`) is owned
by HQ and remains the site-wide public gallery shown to all visitors. Franchise centres
use their own `centre_gallery` (shown on their public centre page). No gallery data is
moved or deleted.

**Batch (superseded 2026-08-13 — see below):** ~~a **batch** is `(centre, stream,
class)` with a code like `XI-J` (JEE, Class 11), decoupled from any single course.
Each franchise centre auto-gets one batch per stream×class.~~ Franchise batches are
now **centralized on PAN-India batches** instead — see "Batch (centralized,
2026-08-13)" below. Kota HQ keeps its existing course-linked batches untouched
either way. Batch membership (for CBT test targeting via `tests.cbt_allowed_batch_ids`
and for grouping) remains separate from course enrollment.

**Batch (centralized, 2026-08-13):** franchise centres no longer get their own
per-centre batches. Every franchise student is assigned one of the 6 **PAN-India
batches** (`course_batches` with `centre_id IS NULL`, `course_id` set) — `J-XI`
(JEPAN-XI), `J-XII`, `J-XIII`, `M-XI` (MEPAN-XI), `M-XII`, `M-XIII` — keyed by
stream (JEE/NEET) × class (11/12/Dropper). `create_standard_batches()` (called by
the `trg_centre_create_batches` trigger on centre creation) is now a **no-op**;
the ~490 previously auto-created per-centre placeholder batches (`XI-J`, `XII-J`,
`XIII-J`, `XI-N`, `XII-N`, `XIII-N` per centre) were deleted and any student
sitting in one was reassigned to the matching PAN-India batch by code (migration
`20260813060000_centralize_pan_india_batches`). **Kota HQ is unaffected** — its
own batches (`XI-J1`, `XII-A2`, `XIII-V2`, etc.) are real course-linked classroom
sections, a different naming scheme, never touched by the trigger. Any query/UI
that lists "batches for centre X" **must** include `centre_id IS NULL` rows (the
PAN-India batches) alongside that centre's own — `scopeQueryToCentre()` does this
by default; hand-rolled filters (`b.centre_id === primaryCenterId`) do not and
must add `|| b.centre_id === null` (see `AdminStudentsPage`, `CreateTestPage`,
`CbtSettingsPanel` for the pattern). `bulk-import`'s franchise-student fallback
(no `batch_code` given) resolves the PAN-India batch by stream+class via a fixed
code map, not a per-centre lookup.

**Roll number (resolved):** franchise centres auto-assign a roll on student creation,
format `{CITY_CODE}{CENTRE_CODE}{SEQ}` — e.g. `BLR010001` = Bengaluru, centre `01`,
student `0001`. City code is shared by all centres in a city; centre code is unique
within the city; sequence is per-centre. **Kota HQ is exempt** — it keeps manual /
CSV-provided roll numbers (existing data untouched, new Kota students still manual).
The per-centre code is shown in the super-admin centres table.

**Course validity (resolved):** a course has a fixed **`end_date`**; every enrollment
loses access after that date (same expiry for all buyers). Set while creating/editing
the course; `enrollments.expires_at` mirrors `course.end_date`. Course access checks
(client + RLS) must honour it.

**Centre suspension (resolved):** super admin can **suspend** a centre (e.g. unpaid
annual fee). While suspended: all students AND staff of that centre are blocked from
logging in on every path (password, OTP, CBT); existing sessions are kicked; centre
admin cannot act; the centre is hidden from the public `/centres` listing/detail.
Content is dormant, not deleted. Fully reversible by un-suspending.

**Centre code (resolved):** `centres` gains `city_code` (3 letters, e.g. `BLR`, shared
by all centres in a city) and `centre_code` (2 digits, unique within the city). The
super-admin centres table shows the full prefix `BLR01`. Kota HQ may leave these blank
(manual rolls).

**Course store/visibility (resolved):** the public e-store shows **only global online
courses**. Franchise offline courses are **assigned** by the centre (enrollment / bulk
import) and appear only in the student's *My Courses*, never in the store. A student's
course list = their `enrollments` (assigned offline + purchased online).

**Centre roles (resolved):** five preset **scope='centre'** roles are seeded — Centre
Admin, HR, Frontdesk, Academics, Content Manager — each with a default permission grid
that super admin can retweak in the existing **Add Role** modal (module × view/create/
edit/delete/export checkboxes). Module keys are shared with the admin catalog wherever
the underlying table is the same (see "Centre admin portal" below).

**Career enquiry (resolved):** the public career form gains a **preferred-centre
dropdown** (published, non-suspended centres). It sets `enquiries.centre_id`; the
application lands in that centre's **Enquiries** tab; HQ/super admin still sees all.

**Delivery phasing:** Phase 1 (shipped 2026-07-07) = data model + super-admin features
(backfill to Kota, centre_id + is_global on courses/tests/series, batch decouple, roll
numbers, centre codes, suspension, course validity, career-centre dropdown, seed role
presets). Phase 2 (shipped 2026-07-07) = centre_admin merged into `/admin/*`, reusing
the existing admin pages rather than building a parallel portal (see below).

## Centre admin portal (Phase 2 — merged into /admin/*)

Originally planned as a separate `/centre/*` app; changed because the existing admin
pages hardcode `/admin/...` internal navigation (Edit/Create links), which would break
under any other route prefix, and because reusing proven components was preferred over
rebuilding them. **`ProtectedAdminRoute` allows `center_admin` in addition to
admin/super_admin.** `AdminLayout` detects `isCenterAdmin` and renders a **separate,
fixed nav list** (never the general admin menu) built from one hardcoded module-key
allowlist, further filtered by that user's own `role_permissions` if they have a
custom sub-role:

| Tab | Reused page | Table(s) |
|---|---|---|
| Students | `AdminStudentsPage` | `profiles` |
| Student Analysis | `AdminStudentReportsPage` | `profiles`/`test_attempts`/`enrollments` |
| Courses | `AdminCoursesPage` + `CreateCoursePage` | `courses` (centre-owned, offline-only) |
| Batches & CBT Setup | `AdminBatchesPage` | `course_batches` (view only — franchise admins can't create) |
| Test Platform | `AdminTestPlatformHub` | `tests`/`test_series`/`test_questions` (centre-owned) |
| Enquiries | `AdminEnquiriesPage` | `enquiries` (`source_type='website'`) |
| Centre Support | `AdminCenterSupportPage` | `enquiries` (`source='center_support'`) |
| Gallery | **`AdminCentreGalleryPage`** (new) | `centre_gallery` — NOT the same table as admin's own "Gallery" (`gallery_albums`, the site-wide public gallery) |
| News & Updates | **`AdminNewsUpdatesPage`** (new) | `centre_updates` — no admin equivalent existed |

**Data scoping is RLS's job, not the UI's.** None of the reused pages do client-side
`centre_id` filtering — a centre user's queries are naturally bounded by RLS
(`has_permission(..., centre_id)`), while admin/super_admin's `is_admin_or_super()`
bypass sees everything. This is why `has_permission()` **must** take the row's centre_id
(see below) — without it, reuse would have silently let one centre edit another's data.

**Course/test/series creation** (`CreateCoursePage`, `CreateTestPage`,
`CreateTestSeriesPage`) detect `isCenterAdmin` (from `useAuth()`): if true, force
`centre_id = useCenterAdmin().primaryCenterId` and `is_global = false` (hiding the
toggle; Course's Mode dropdown excludes "Online"); otherwise default to HQ with the
toggle visible, as before.

**Landing/redirect:** `center_admin` has no dashboard-equivalent — `homeForRole()`
(`ProtectedRoute.tsx`), `LoginPage`, and `AdminLoginPage` all send them to
`/admin/students` (the first tab) instead of `/admin/dashboard`.

**Fixed (2026-07-07):** `admin-set-cbt-password`/`admin-bulk-cbt-passwords` now verify
the target student belongs to a centre the caller staffs (via the new shared
`supabase/functions/_shared/authz.ts` → `resolveCallerAccess()`), returning
`forbidden_wrong_centre` per out-of-scope row in the bulk case rather than silently
dropping it. `AdminEnquiriesPage` excludes `source='center_support'` so Centre Support
tickets never double-appear in the general Enquiries tab; `AdminCenterSupportPage`
gained the same admin/super_admin centre-wise filter dropdown Enquiries already had.

**Scalability pass (2026-07-07):** indexed every centre-scoped table this phase made a
live query/RLS path (`tests`, `test_series`, `centre_banners`, `centre_gallery`,
`centre_updates`, `course_batches`); extracted `src/lib/centreOwnership.ts`
(`resolveContentOwnership`) to de-duplicate the centre/HQ-ownership logic that had
drifted into 3 near-identical copies; `useCenterAdmin()` now skips its query entirely
for non-`center_admin` sessions (called on every `/admin/*` page render).

**Orphaned tables dropped (2026-07-07):** `centre_courses`, `centre_online_courses`,
`centre_online_chapters`, `centre_online_lessons`, `centre_course_enquiries` dropped via
migration `20260707040000` (confirmed trivial/no real data first). Not fully unused,
though — `CenterOfflineSections.tsx` (public `/centres/:slug` page) still queried
`centre_courses` for an offline-programs listing and had a course-enquiry modal writing
to `centre_course_enquiries`; both were unreachable in practice (nothing has created
`centre_courses` rows since the old center-admin portal that could was removed), so that
dead code was stripped from the component in the same pass — its banner section and
`AdmissionEnquiryModal` (unrelated tables) are unaffected. Future centre-created courses
use the existing unified `courses` table (`centre_id` + `is_global=false`, offline-only).

## Centre (a.k.a. Center)

A physical Bansal franchise/branch. Spelled **centre** in DB tables (`centres`,
`centre_staff`, `centre_online_courses`, etc.); the old separate portal used **center**
(`/center/*`, `CenterLayout` — deleted; both `/center/*` and `/centre` now redirect to
`/admin/students`). Public marketing pages (`CentersPage`, `CenterDetailPage`,
`/centres`, `/centres/:slug`) keep the American spelling in their filenames for
historical reasons but are unrelated to the portal — **do not delete these.**

- **Centre Admin** — a `centre_staff` row with no row in `role_assignments` (i.e. no
  custom role assigned). Has full access to everything `has_permission()` gates for
  centre scope.
- **Centre Staff** — any `centre_staff` row. Non-admin staff are gated by whichever
  centre-scope role (if any) is in `role_assignments` for that user.

## Unified Roles & Permissions (replaces the old admin_roles/centre_roles split)

One shared system now backs both the admin portal's custom roles and centre staff's
custom roles:

- **`roles`** — `id, scope ('admin'|'centre'), name, description, created_by`. Only
  **super_admin** may create/edit/delete roles (RLS-enforced), regardless of scope.
- **`role_permissions`** — `role_id, module, can_view/create/edit/delete/export`.
  Module keys come from `src/lib/adminModules.ts` (scope='admin') or
  `src/lib/centerModules.ts` (scope='centre').
- **`role_assignments`** — `user_id, role_id`. One row per user (a user has at most
  one role assignment). Assigning happens differently per scope:
  - **Admin-scope roles**: assigned by super_admin via the `manage-admin` edge
    function (`assign_custom_role` action) or at login creation time.
  - **Centre-scope roles**: assigned by super_admin OR by the centre_admin who
    administers that user's centre (`is_centre_admin_of` check in RLS), via direct
    writes to `role_assignments` or the `admin-create-center-user` edge function.
    Managed from `/admin/roles` (super_admin creates/edits the 5 presets and can
    assign to any centre's staff there too).

**Full-access shortcut:** in both scopes, a user with *no* row in `role_assignments`
gets full access to their portal (admin → full `/admin/*`; centre_admin → full access
to their centre). Permission gating only kicks in once a role is assigned.

**`has_permission(_user_id, _module, _action, _centre_id DEFAULT NULL)`** — the single
source of truth, security-definer Postgres function. Bypasses for super_admin always;
for admin with no assignment (when `_centre_id` is NULL — admin-portal call sites never
pass it); for centre_admin (`centre_staff` with no assignment, **at that specific
`_centre_id`**) within their centre. Otherwise looks up the assigned role's
`role_permissions` row. **RLS policies on every module-gated table call this function,
passing the row's own centre_id** for centre-scoped tables — this centre-ownership
check was a real bug fixed on 2026-07-07 (see "Centre admin portal" above): earlier,
`has_permission()` never verified *which* centre a row belonged to, so any centre user
could act on any centre's rows. Client-side `useAdminPermissions()` still exists for
nav-filtering/UX (it doesn't take a centre_id — it just resolves "what does my assigned
role permit", independent of which row; row-level centre ownership is RLS's job alone).

## Provisioning

- **Admin logins** — `manage-admin` edge function (`create`, `list`,
  `assign_custom_role` actions). Writes `role_assignments` directly (delete-then-insert
  per user, since a user has at most one assignment).
- **Centre logins** — `admin-create-center-user` edge function. Creates the auth user,
  upserts `centre_staff` (fires `grant_center_admin_role()` → adds `center_admin` to
  `user_roles`, clears stale `student` row), and separately upserts `role_assignments`
  if a centre-scope role was specified. Callable by admin/super_admin for any centre,
  or by that centre's own admin (`is_centre_admin_of` check).

## Known dead / static / vestigial (updated 2026-07-07)

- `app_role` enum still has unused `teacher`/`mentor` values (see above — left in
  place deliberately).
- Live classes: student viewing (`/my-live-classes`, `/live-classes/:slug`) and admin
  management (`/admin/live-classes`) still work; only the teacher-hosted create/room
  pages were removed. Admin is now the one who creates/hosts live classes.
- `centre_courses`, `centre_online_courses` (+ chapter/lesson children), and
  `centre_course_enquiries` were dropped 2026-07-07 (migration `20260707040000`) — see
  "Centre admin portal" above. Franchise course creation goes through the unified
  `courses` table instead.
- There is no `/centre/*` portal or placeholder anymore — `center_admin` lives inside
  `/admin/*` (see "Centre admin portal" above). Both `/center/*` and `/centre` redirect
  to `/admin/students`.
