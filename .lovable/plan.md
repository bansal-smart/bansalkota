
# Plan: Course-centric admin + cleanup

## 1. Remove Mentor & Compete entirely

**DB migration (drop in order):**
- Drop tables: `mentor_announcement_rsvps`, `mentor_announcements`, `mentor_backup_pool`, `mentor_group_reads`, `mentor_group_members`, `mentor_groups`, `mentor_handovers`, `mentor_messages`, `mentor_reviews`, `mentor_student_assignments`.
- Drop tables: `compete_match_answers`, `compete_matches`, `compete_questions`, `compete_queue`, `compete_ratings`.
- Drop related functions/triggers: `notify_mentor_*`, `ensure_mentor_group_membership`, `remove_mentor_group_membership`, `is_mentor_of_group`, `is_member_of_group`, `is_active_backup_*`, `get_compete_question_answers`.
- Remove `'mentor'` from `app_role` enum (after deleting rows in `user_roles` with role='mentor').

**Code removal:**
- Delete pages: `Mentor*Page.tsx`, `MentorshipPage.tsx`, `StudentMentorChatPage.tsx`, `CompetePage.tsx`, `AdminCompeteQuestionsPage.tsx`, `AdminMentorAssignmentsPage.tsx`, `AdminMentorHandoversPage.tsx`, related components/hooks under `src/components/mentor*`, `src/components/compete*`.
- Remove routes from `App.tsx` and nav entries from `AdminLayout.tsx`, student dashboard cards, footer links, role-based menus.
- Update memory: drop the `mentor` role line (keep `student, teacher, admin, super_admin`).

## 2. Make courses fully dynamic + admin-synced

Existing `courses`, `chapters`, `lessons`, `course_resources`, `live_classes`, `tests` already cover most of this. Wiring fixes:

- **Public courses page** (`CoursesPage.tsx`, `CourseDetailPage.tsx`) — already reads from `courses`. Audit: remove any hard-coded fallback arrays so what admin creates is what users see (single source of truth).
- **Admin courses list** (`AdminCoursesPage.tsx`) — show every row in `courses` (published + draft) with status badge, enrolled count, chapters count, tests count.
- **Course content editor** (`AdminCourseContentPage.tsx`, route `/admin/courses/:id/content`) — tabbed UI:
  - **Overview**: title, slug, description, thumbnail, price, tags, what-you-learn, requirements, publish toggle.
  - **Subjects & Chapters**: list chapters grouped by `chapters.subject`. Add/edit/reorder chapters under any subject.
  - **Lectures**: per chapter, "Add from Lecture Bucket" (search by title) or "Add new" (creates bucket entry + lesson). Lesson rows show source bucket title + YouTube link.
  - **PDFs / Study Material**: uses `course_resources` (already exists). Upload → `course-resources` bucket.
  - **Live Classes**: list `live_classes WHERE course_id=:id`, schedule new one inline (educator, datetime, meeting url).
  - **Tests**: list `tests WHERE course_id=:id`, "Create test" opens existing `CreateTestPage` prefilled with course_id; assign questions from question bank or add inline.
  - **Students Enrolled**: read `enrollments` joined with `profiles`.

## 3. Lecture Bucket (new)

New table `lecture_bucket`:
- `id`, `title`, `description`, `subject`, `topic`, `youtube_url`, `duration_seconds`, `thumbnail_url`, `tags[]`, `created_by`, timestamps.
- GRANTs + RLS: admins manage; authenticated can SELECT (for picker).

Modify `lessons`:
- Add nullable `lecture_id uuid REFERENCES lecture_bucket(id) ON DELETE SET NULL`.
- When a lesson references a bucket item, the player reads title/url live from the bucket → edits propagate.

Admin page `/admin/lecture-bucket` (`AdminLectureBucketPage.tsx`):
- Searchable table, CRUD, bulk import via CSV (optional later).
- "Used in N courses" count.

Lecture picker dialog reused inside course content editor.

## 4. Question Bank improvements

Keep schema as-is (subject + topic + difficulty already present). UI work only:
- `AdminQuestionBankPage.tsx` — filters: subject, topic, level (difficulty), search by text or question ID; show question ID (short uuid prefix) in list.
- Inside test editor (`CreateTestPage`) add **"Add from Question Bank"** dialog with same filters and multi-select, plus existing **"Add new question"** form. Copies row into `test_questions` on insert.

## 5. Single Banner system

- `site_banners` already exists; admin `AdminBannersPage` currently allows many.
- Enforce single-active rule: when admin saves a banner with `is_active=true`, set all others to `is_active=false` (handle in client save + a partial unique index `WHERE is_active`).
- Public site reads the one active banner row.

## 6. Cleanup & routing

- Update `AdminLayout.tsx` sidebar groups: **Content** (Courses, Lecture Bucket, Question Bank, Books, Banners), **Assessments** (Tests, Test Series, Attempts, Import Batches), **People** (Students, Teachers, Admins, Educator Applications), **Operations** (Orders, Payments, Enquiries, Notifications, Moderation, Reports, BOOST, Centers, Schools, Toppers, Exams, Live Classes), **Settings**.
- Remove Mentor and Compete entries.
- `StudentDashboard` — remove mentor/compete cards.

## 7. Technical details

**Migration order (single file):**
1. `DROP TABLE ... CASCADE` for compete_* and mentor_* tables.
2. `DROP FUNCTION ...` for orphaned functions.
3. `DELETE FROM user_roles WHERE role='mentor'`; recreate `app_role` enum without 'mentor' (rename + swap pattern).
4. `CREATE TABLE public.lecture_bucket(...)` + GRANT + RLS + policies.
5. `ALTER TABLE public.lessons ADD COLUMN lecture_id uuid REFERENCES public.lecture_bucket(id) ON DELETE SET NULL`.
6. Partial unique index on `site_banners(is_active) WHERE is_active`.

**Code touchpoints (high level):**
- Delete ~25 mentor/compete files.
- Edit `App.tsx`, `AdminLayout.tsx`, `StudentDashboard.tsx`, `LandingPage.tsx`, footer/header.
- New: `AdminLectureBucketPage.tsx`, `LecturePickerDialog.tsx`, `QuestionBankPickerDialog.tsx`.
- Rewrite `AdminCourseContentPage.tsx` with tabbed structure described above.
- Refresh `AdminCoursesPage.tsx` to show full live data.
- Tighten `AdminBannersPage.tsx` for single-active rule.

## Out of scope (ask if needed)
- Public site visual redesign — only data wiring will change.
- Backfilling existing `lessons.video_url` into `lecture_bucket` — left manual; admin can re-add via picker.
- Bulk CSV import for lecture bucket — can follow later.
