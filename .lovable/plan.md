## Goal

Enable cross-role reporting (student↔mentor/teacher, mentor→student, teacher→student), surface a unified "Reports" tab in the admin sidebar visible to admin + super admin, and rename "Student Report" to "Student Analysis".

## What already exists (reuse)

- `public.reports` table (reporter_id, reported_user_id, reported_role, category, subject, description, status, evidence_url, resolution_notes, …) with RLS: any authenticated user can insert their own report; admin/super_admin can view and update all.
- `ReportDialog` component (`src/components/ReportDialog.tsx`) — already wired to insert into `reports` and trigger the existing `notify_report_created` trigger (notifies the reported user + all admins).
- `AdminModerationPage` already lists every row in `reports` with severity, filter, and resolve/dismiss actions — but it's mounted only for super-admin under Moderation.

## Changes

### 1. Database (one small migration)

The current `reports_reported_role_check` constraint allows only `teacher | mentor | staff | other`. Drop it and re-add it to also allow `student` so mentors and teachers can report students.

### 2. Sidebar (`src/components/AdminLayout.tsx`)

- Rename the existing item label `"Student Report"` → `"Student Analysis"` (path stays `/admin/student-reports`, icon stays `FileBarChart`).
- Insert a new item **right below** it, visible to both admin and super-admin:
  `{ label: "Reports", icon: Flag, path: "/admin/reports" }`.

### 3. New admin page `src/pages/AdminReportsPage.tsx`

A focused list of all submitted reports, accessible to admin + super-admin (route guarded by the existing `ProtectedAdminRoute`). Built by lifting the proven listing logic from `AdminModerationPage` and adding:

- Filter chips: All / Student / Mentor / Teacher (filters by `reported_role`) and status filter (Pending / In progress / Resolved / Dismissed).
- Each row shows: reporter name + role, reported name + role badge, category, subject, description, evidence link, time-ago, status pill, and Resolve / Dismiss actions.
- Joins `profiles` for reporter and reported display names where available.
- Realtime channel on the `reports` table so new reports appear without refresh (per the realtime guideline).

The existing `AdminModerationPage` stays as-is for super-admin (content moderation focus); this new page is the cross-role reports inbox the user described.

### 4. Wire `ReportDialog` into the right surfaces

Reuse the existing component. Add a "Report" entry point in each of these places, prefilled with the right `reportedRole` and `reportedUserId`:

- **Student → Mentor**: in `StudentMentorChatPage` header (next to the existing "Rate your mentor" button) and on the mentor card on the student dashboard.
- **Student → Teacher**: on the teacher/educator info card shown on `LiveClassRoomPage` and on the doubt answer card in `DoubtPage` (when an answer is from a teacher).
- **Mentor → Student**: in `MentorStudentsPage` row actions (per-student kebab/menu).
- **Teacher → Student**: in `TeacherStudentsPage` row actions and from `TeacherDoubtQueuePage` for the student who asked the doubt.

### 5. Routing (`src/App.tsx`)

Add `<Route path="/admin/reports" element={<AdminReportsPage />} />` inside the existing `ProtectedAdminRoute` block. Lazy import next to the other admin pages.

## Out of scope

- No changes to the Moderation page or its super-admin gating.
- No changes to the existing "Student Analysis" page beyond the sidebar label.
- No changes to email/notification copy — the existing `notify_report_created` trigger already handles fan-out.

## Files touched

- `supabase/migrations/<new>.sql` — relax `reports_reported_role_check` to include `student`.
- `src/components/AdminLayout.tsx` — rename + new nav item.
- `src/App.tsx` — new admin route.
- `src/pages/AdminReportsPage.tsx` — new file.
- `src/pages/StudentMentorChatPage.tsx`, `src/pages/StudentDashboard.tsx`, `src/pages/LiveClassRoomPage.tsx`, `src/pages/DoubtPage.tsx`, `src/pages/MentorStudentsPage.tsx`, `src/pages/TeacherStudentsPage.tsx`, `src/pages/TeacherDoubtQueuePage.tsx` — drop in `<ReportDialog ... />`.