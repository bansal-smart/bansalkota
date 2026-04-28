# Staff Dashboard: Enquiries, Course Content, Reports

Add three new modules to the staff panel (`/admin/*`) so staff can:
1. Manage **general enquiries** submitted from public pages (Contact / Admissions / Mentorship).
2. Upload and manage **course content** (PDFs, notes) inside a specific course.
3. Manage **student reports** about teachers/mentors with status workflow.

---

## 1. Database (new migration)

### `enquiries` table
Captures public form submissions (Contact us, Admission/Scholarship enquiry, Mentorship enquiry).
- `id`, `name`, `email`, `phone`, `message`, `source` (`contact` | `admission` | `mentorship` | `other`), `region` (`india` | `dubai`), `status` (`new` | `in_progress` | `resolved` | `closed`), `assigned_to` (uuid, staff), `staff_notes` (text), `created_at`, `updated_at`.
- RLS: `INSERT` allowed for `anon` + `authenticated` (public submission). `SELECT/UPDATE` only for `staff`/`admin` via `has_role()`.
- Duplicate guard: function `enquiry_recently_submitted(_email, _phone)` mirroring the educator pattern (blocks resubmission within 24h).

### `course_resources` table
Per-course PDFs/notes (we already have `course_pdfs`, but it lacks resource type, description, visibility, chapter scoping). Add a richer table:
- `id`, `course_id` (uuid), `chapter_id` (uuid, nullable — for chapter-level scoping), `title`, `description`, `resource_type` (`pdf` | `notes` | `worksheet` | `solution` | `other`), `file_url`, `file_size_bytes`, `mime_type`, `is_published` (bool), `position` (int), `uploaded_by` (uuid), `created_at`, `updated_at`.
- RLS: staff/admin manage all; teachers manage resources of their own courses; enrolled students (and anyone for published courses) can `SELECT` rows where `is_published = true`.
- Storage: reuse the existing public `educator-uploads` bucket with a `course-resources/{course_id}/` prefix, OR add a new `course-resources` bucket (private with signed URLs). Recommended: **new private bucket** + storage RLS keyed off enrollment / staff role.

### `reports` table
Student → teacher/mentor reports.
- `id`, `reporter_id` (uuid, student), `reported_user_id` (uuid, nullable), `reported_name` (text — for mentors not in `auth.users`), `reported_role` (`teacher` | `mentor` | `staff` | `other`), `category` (`misconduct` | `inappropriate_content` | `no_show` | `payment` | `other`), `subject` (text), `description` (text), `evidence_url` (text, nullable), `status` (`pending` | `in_progress` | `resolved` | `dismissed`), `resolution_notes` (text), `handled_by` (uuid, staff), `created_at`, `updated_at`.
- RLS: students `INSERT` their own report and `SELECT` only their own; staff/admin can `SELECT`/`UPDATE` everything.
- Trigger: notify the student (`notifications` table) on status change.

---

## 2. Public-side wiring (small additions)

- **Contact / Admissions / Mentorship pages**: replace existing form handlers (or add forms where missing) so submissions insert into `enquiries` with the correct `source` value, with zod validation and the duplicate-check RPC.
- **Student "Report" entry point**: add a "Report" button on Educator detail / Mentor card / Live Class room (teacher header) that opens a small dialog inserting into `reports`.

---

## 3. Staff UI (new pages + sidebar entries)

Update `src/components/AdminLayout.tsx` `navItems` to add:
- Enquiries (`/admin/enquiries`) — `Inbox` icon
- Course Content (`/admin/course-content`) — `FileText` icon
- Reports (`/admin/reports`) — `Flag` icon

Rename current "Enquiries Dashboard" → "Overview" (it shows educator applications; keep as-is).

### `src/pages/AdminEnquiriesPage.tsx`
- Table of all enquiries with filters: `status`, `source`, `region`, search.
- Row actions: open detail drawer with full message, assign to self, change status (dropdown: new / in_progress / resolved / closed), add staff note.
- Stat tiles: total, new, in_progress, resolved this week.

### `src/pages/AdminCourseContentPage.tsx`
- **Step 1**: Course picker (search + select from `courses` table).
- **Step 2**: Once a course is selected, show:
  - Optional chapter filter (from `chapters` table).
  - Existing resources list (title, type badge, size, published toggle, edit, delete).
  - "Upload resource" button → dialog with: title, description, resource_type, chapter (optional), file (PDF / DOC / DOCX / image, max 25 MB), publish toggle.
  - Upload to `course-resources` bucket → insert row in `course_resources`.
- Validation via zod; show progress; success/error toasts.

### `src/pages/AdminReportsPage.tsx`
- Table with filters: `status`, `category`, `reported_role`, search.
- Severity-style badges (reuse pattern from `AdminModerationPage`).
- Row → detail drawer: full description, reporter info, evidence link, status dropdown (`pending` / `in_progress` / `resolved` / `dismissed`), resolution notes textarea, "Save & notify reporter" button (writes back + creates a `notifications` row for the student).

### Routing (`src/App.tsx`)
Register the three new routes inside the existing protected `AdminLayout` block.

---

## 4. Technical notes

- Reuse existing helpers: `has_role()`, `update_updated_at_column()` trigger.
- New RPC `submit_enquiry(_payload jsonb)` is **not** needed — direct insert with RLS is enough; add a `BEFORE INSERT` trigger to enforce 24h dedupe by `(lower(email), phone, source)`.
- For storage RLS on `course-resources`, allow:
  - `INSERT/UPDATE/DELETE` for staff/admin and the course's `created_by` (teacher).
  - `SELECT` for staff/admin, course owner, and any authenticated user with an active row in `enrollments` for that `course_id`.
- All new pages follow the existing card/badge styling and Lucide icons (no emojis), per project memory.
- Type-check after implementation.

---

## Files to create / edit

**Create**
- `supabase/migrations/<ts>_staff_modules.sql` — three tables, RLS, triggers, dedupe function, storage bucket + policies.
- `src/pages/AdminEnquiriesPage.tsx`
- `src/pages/AdminCourseContentPage.tsx`
- `src/pages/AdminReportsPage.tsx`
- `src/components/ReportDialog.tsx` (reusable — opened from educator/mentor/live-class views)

**Edit**
- `src/components/AdminLayout.tsx` — add 3 sidebar entries.
- `src/App.tsx` — register 3 routes.
- `src/pages/ContactPage.tsx`, `src/pages/AdmissionsPage.tsx`, `src/pages/MentorshipPage.tsx` — wire submission forms to `enquiries`.
- One or two student-facing pages (e.g., `EducatorsPage.tsx`, `LiveClassRoomPage.tsx`) — add "Report" button using `ReportDialog`.
