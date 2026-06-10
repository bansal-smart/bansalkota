## Centre System Overhaul

Builds a self-serve **Centre Panel** for each Bansal offline centre, plus signup mapping and a support channel to super admin.

---

### 1. Database (migration)

**New enum value**
- Extend `app_role` with `center_admin`.

**New tables**

- `center_staff` — multi-admin per centre
  - `center_id` (fk → centers), `user_id` (fk → auth.users), `role` ('owner' | 'manager'), unique(center_id, user_id)
  - RLS: centre staff read own rows; super_admin manages all.
  - Trigger: on insert, also insert `(user_id, 'center_admin')` into `user_roles` if missing.

- `center_courses` — offline courses created by a centre
  - `center_id`, `title`, `slug`, `banner_url`, `start_date`, `duration`, `fees`, `schedule`, `target_exam`, `class_level`, `description`, `highlights jsonb`, `is_published`, `created_by`, timestamps.
  - RLS: public read where `is_published=true`; centre staff write only for their centre; super_admin full.

- `center_course_enquiries` — leads for offline courses
  - `center_id`, `course_id` (fk → center_courses), `name`, `phone`, `email`, `class_level`, `message`, `status` ('new'|'contacted'|'admitted'|'closed'), `created_at`.
  - RLS: centre staff of that centre read/update; super_admin full; public insert (with simple rate-limit via existing pattern).

- `center_banners` — centre-page hero/promo banners (centre-editable)
  - `center_id`, `title`, `subtitle`, `image_url`, `cta_label`, `cta_url`, `sort_order`, `is_active`.

**Extend existing tables**
- `profiles`: add `center_id uuid null references centers(id)`, `is_bansal_offline_student boolean default false`.
- `enquiries`: add `source_type text` ('website' | 'center_support' | 'admission'), `center_id uuid null`, `priority text`, `category text`. Existing rows backfill `source_type='website'`.
- `tests`/`courses`: unchanged. Online courses already flow to all centres by default.

**Helper functions**
- `is_center_staff(_user_id uuid, _center_id uuid) returns boolean` (SECURITY DEFINER).
- Reuse `has_role(_, 'center_admin')` for portal gating.

All new public tables get the standard GRANTs and `updated_at` triggers.

---

### 2. Centre Panel (`/center/*`)

New route group, mirroring `AdminLayout` styling but scoped.

- `CenterLoginPage` — same `/login` works; redirect rule: if user has `center_admin` role and no other admin role → land on `/center`.
- `CenterLayout` + `ProtectedCenterRoute` — guards on `has_role('center_admin')` and resolves their `center_id` from `center_staff`.

**Modules (sidebar)**
1. **Dashboard** — quick counts (enquiries today, published offline courses, open support tickets).
2. **Centre Page Banners** — CRUD on `center_banners` (image upload to `site-content` bucket under `centers/{center_id}/`).
3. **Offline Courses** — CRUD on `center_courses` with banner upload, start date, schedule, fees, brochure link. Cannot toggle online courses.
4. **Website Enquiries** — read-only list of `enquiries` where `center_id = mine`, filterable by status; mark contacted/closed.
5. **Course Enquiries** — `center_course_enquiries` for their centre; status pipeline.
6. **My Students** — `profiles` where `center_id = mine`; columns: name, class, target exam, phone, joined. Read-only.
7. **Support** — raise ticket to super admin (writes to `enquiries` with `source_type='center_support'`, `center_id=mine`); thread of past tickets with status.

---

### 3. Public Centre Page (`/centers/:slug`)

Refactor `CenterDetailPage.tsx` to hydrate from DB and add:
- **Hero/banner carousel** from `center_banners`.
- **Online Courses** section — pulls global published `courses` (existing data).
- **Offline Courses** section — pulls `center_courses` for this centre; each card shows banner, title, start date, schedule, fees, and an **"Enquire about this course"** button → modal posting to `center_course_enquiries`.
- **Admission / General enquiry form** at bottom → posts to `enquiries` with `center_id=this.center.id`, `source_type='admission'`.

---

### 4. Signup centre mapping (`SignupPage.tsx`)

Add a step in the existing form (between basic details and submit):
- Radio: *"Are you studying at a Bansal offline centre?"* (Yes / No)
- If Yes → searchable centre dropdown (from `centers` where `is_published`).
- On signup, write to `profiles.center_id` and `is_bansal_offline_student` via the existing `handle_new_user` flow (extend trigger to read `raw_user_meta_data->>'center_id'`).
- Also editable later from `ProfilePage`.

---

### 5. Super Admin additions

- **Centres → Staff tab** in `AdminCentersPage`: invite/assign users as centre staff (search by email → upsert into `center_staff`, auto-grants `center_admin` role).
- **Centre Complaints** page (`AdminCenterSupportPage`) in sidebar: lists `enquiries` where `source_type='center_support'`, threaded replies via existing reply pattern, status workflow (open → in_progress → resolved). Reuses enquiries table to avoid a new ticket model.
- Existing `AdminEnquiriesPage` gets a `source_type` filter to separate website vs centre-support.

---

### 6. Routing & nav

- `App.tsx`: add `/center`, `/center/banners`, `/center/courses`, `/center/enquiries`, `/center/course-enquiries`, `/center/students`, `/center/support` under `ProtectedCenterRoute`.
- `AdminLayout` sidebar: add **Centre Complaints** entry.
- Post-login redirect (in `AuthContext` or `LoginPage`): centre_admin without admin → `/center`.

---

### Technical notes

- All centre-write RLS uses `public.is_center_staff(auth.uid(), center_id)`; super_admin always passes via `is_admin_or_super`.
- Image uploads reuse the public `site-content` bucket under `centers/{center_id}/...`.
- No changes to payment, test, or live-class flows.
- New notification triggers (optional, low-risk): notify centre staff on new `center_course_enquiries`; notify super admin on `source_type='center_support'`.

---

### Out of scope (will not change)
- Existing online course creation, test engine, live classes, payments.
- Public Centres listing page styling (only data source remains the same).
