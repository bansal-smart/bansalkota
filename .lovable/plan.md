## Goal

Finish the **Phase 1 admin gap** (real user management) and ship the **web-scope chunk of Phase 2**: real courses catalog, course detail, enrollment flow with DB writes, working lecture player tied to `lesson_progress`, and a Course Studio (teacher) that actually persists to the database.

Out of scope (skipped per your instruction): mobile (Flutter), AWS Mumbai migration, Razorpay/Stripe live payment gateways (we'll stub the payment step but write a real `enrollments` row on success — actual gateway integration becomes a follow-up).

---

## Part A — Phase 1 closeout: Admin User Management

**Database**
- Add `is_suspended boolean default false` and `plan text default 'Free'` columns to `profiles` (so the admin table can show + toggle them).
- Add RLS policy: staff/admin can `UPDATE` profiles (suspend / change plan / change role).
- Add an `admin_set_user_role(_user_id uuid, _role app_role)` SECURITY DEFINER RPC so admins can assign/revoke `student/teacher/staff/admin` roles in `user_roles` (currently no insert/update policy exists on `user_roles`).

**Frontend — `src/pages/AdminUsersPage.tsx`**
- Replace the hardcoded `allUsers` array with a Supabase query joining `profiles` + `user_roles` (use a `useQuery` hook).
- Real search by name/email, real role filter, real pagination (server-side `range()` with page size 20).
- Drawer: show real phone/country/city/joined-at/target_exam.
- Wire **Edit Role** → calls `admin_set_user_role` RPC.
- Wire **Suspend / Unsuspend** → updates `profiles.is_suspended`.
- Wire **Send Notification** (bulk) → inserts rows into `notifications` for each selected user.
- Real **Export CSV** of currently-filtered rows.
- Defer "Invite User" (needs a backend invite flow) — keep button but route to a "coming soon" toast for now.

---

## Part B — Phase 2: Courses catalog + detail (dynamic)

**Database**
- Add `chapters` table: `id, course_id, title, position, created_at`.
- Add `lessons` table: `id, course_id, chapter_id, slug, title, position, duration_seconds, video_url, is_free_preview, type ('video'|'pdf'|'quiz'), created_at`.
  - `(course_id, slug)` unique.
- Add `course_highlights` is implicit via aggregating `lessons`; no separate table.
- RLS: lessons of published courses are SELECT-able by everyone; staff/teachers can manage. (Teacher ownership tracked via a new `courses.created_by uuid` column → policy: educator can manage own courses.)
- Seed the 6 existing courses with 2-3 chapters and 4-6 lessons each (using sample video URLs, no real video infra yet).

**Frontend**
- **`CoursesPage.tsx`**: replace static `courses` array with Supabase query of `courses` where `is_published = true`. Real filters by `target_exam` and `subject`. "My Courses" tab queries `enrollments` for the current user.
- **`CourseDetailPage.tsx`**: fetch by slug from `courses`; render real chapters + lessons in the syllabus accordion; real price; real highlights (counts from `lessons` table); "Enroll Now" opens `EnrollmentModal`.
- **`MyCoursesPage.tsx`**: already wired to real data — verify after seeding.

---

## Part C — Enrollment flow with DB persistence

**Frontend — `src/components/EnrollmentModal.tsx`**
- Accept `courseId` + `coursePrice` + `courseName` props.
- On "Pay" click: skip real gateway for now → write a row to `enrollments` (`user_id`, `course_id`, `is_active=true`), insert a "Welcome to {course}" notification, send a transactional email via the existing `process-email-queue` infra, then show success.
- Show a clear "**Demo checkout** — payment gateway not connected yet" notice in the payment step so it's not misleading.
- Wire from `CourseDetailPage` "Enroll Now" button.

---

## Part D — Lecture player tied to lesson_progress

**Frontend — `src/pages/LecturePlayerPage.tsx`**
- Read `:slug` param, fetch course + chapters + lessons + this user's `enrollments` row + `lesson_progress` rows.
- Gate access: if no active enrollment, redirect to course detail with a toast.
- Show real chapter/lesson list in sidebar, mark completed/playing/locked from `lesson_progress.is_completed`.
- Use HTML5 `<video>` with the lesson's `video_url` (real video pipeline = future task; works fine with any MP4/HLS URL today).
- On `timeupdate` (throttled to every 5 s): upsert `lesson_progress` (`watched_seconds`, `total_seconds`, `last_watched_at`).
- On 90 % watched: mark `is_completed = true`, increment `enrollments.completed_lessons`, recompute `progress_percent`, update `enrollments.last_lesson_title`, and create a `study_sessions` row (so dashboard streak/accuracy reflect lecture watching).
- "Notes" tab: persist per-lesson notes to a new `lesson_notes` table (`user_id, lesson_id, content`, RLS = own rows only).

---

## Part E — Course Studio (teacher) persistence

**Frontend — `src/pages/CreateCoursePage.tsx`**
- Replace local-state-only form with full DB writes: insert into `courses` (with `created_by = auth.uid()`), then insert chapters and lessons in order.
- Thumbnail upload → reuse the existing `educator-uploads` storage bucket.
- "Save Draft" sets `is_published = false`, "Publish Course" sets `is_published = true`.
- **`TeacherCoursesPage.tsx`**: fetch teacher's own courses (`courses where created_by = auth.uid()`), with edit + unpublish actions.
- **`AdminCoursesPage.tsx`**: replace static array with real query of all courses + enrollment counts; approve/reject toggles `is_published`.

---

## Files to create / edit

**New**
- `src/hooks/useAdminUsers.ts`
- `src/hooks/useCourses.ts`, `src/hooks/useCourseDetail.ts`, `src/hooks/useLessonPlayer.ts`
- 1 migration: schema (chapters, lessons, lesson_notes, profiles columns, RLS, RPC)
- 1 data-insert: seed chapters/lessons for the 6 existing courses

**Edited**
- `src/pages/AdminUsersPage.tsx`
- `src/pages/CoursesPage.tsx`, `src/pages/CourseDetailPage.tsx`, `src/pages/LecturePlayerPage.tsx`, `src/pages/MyCoursesPage.tsx`
- `src/components/EnrollmentModal.tsx`
- `src/pages/CreateCoursePage.tsx`, `src/pages/TeacherCoursesPage.tsx`, `src/pages/AdminCoursesPage.tsx`

---

## Explicitly NOT in this batch

- Real Razorpay / Stripe gateway (modal will write enrollment directly; gateway becomes a focused follow-up).
- Real video hosting (Mux / Cloudflare Stream) — uses `video_url` field, any MP4/HLS works today.
- Phone OTP login.
- Tests engine, Agora live video, Doubts schema, push notifications — all Phase 3.

After approval I'll execute migrations first, then ship the code in the order above.