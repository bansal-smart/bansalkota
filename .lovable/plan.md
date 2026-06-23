# Online Courses for Centre Dashboard

Add a new "Online Courses" module to the Centre Admin panel (right after Gallery) so each centre can build its own online video courses — independent from the platform-wide Bansal courses. Centre admins create a course → add chapters → add lectures (YouTube). They can also bulk-upload lectures from an XLSX file in the format you shared.

## Scope

- New sidebar tab **"Online Courses"** in Centre Dashboard (after Gallery, before Offline Courses).
- Listing page → create / edit / delete centre online courses.
- Course detail page → manage chapters + lectures (similar to Admin Course Content flow, scoped to centre).
- **Bulk Lecture Import** (XLSX) on a course's detail page — columns: `subject`, `Chapter Name`, `Lecture Name`, `topic`, `Youtube Link`. Auto-creates chapters by name and adds lectures into them. Re-importing the same lecture (same chapter + title) updates the YouTube link.
- Courses, chapters, lectures are **centre-specific** — only that centre's admins (and platform admins) can manage them. Students mapped to that centre see them on the centre's online learning page (separate concern; out of scope for this turn but data model supports it).

## Data model (new tables)

```text
centre_online_courses
  centre_id, title, slug, description, thumbnail_url,
  target_exam, class_level, subject, is_published, sort_order, created_by

centre_online_chapters
  centre_course_id, title, subject, position, is_published

centre_online_lessons
  centre_course_id, centre_chapter_id, title, topic,
  video_url, youtube_id, duration_seconds, position, is_published
```

RLS:
- Centre staff of the owning centre + admin/super_admin → full manage.
- `authenticated` SELECT when `is_published` (students/centre-mapped users can read).
- All tables get GRANTs + RLS + policies + updated_at trigger.

## Frontend

New files:
- `src/pages/CenterOnlineCoursesPage.tsx` — list, create, edit, delete centre online courses (similar visual style to `CenterCoursesPage`).
- `src/pages/CenterOnlineCourseContentPage.tsx` — chapters + lectures manager; trimmed-down version of `AdminCourseContentPage` (chapter add/edit/delete, YouTube lecture add/edit/delete, drag-reorder, **Bulk import** button).
- `src/components/CentreLectureBulkImportDialog.tsx` — XLSX/CSV uploader; parses with `xlsx` lib (already a dep via existing bulk imports — will verify and add if missing); preview rows → confirm → batch insert.

Updates:
- `src/pages/CenterDashboardPage.tsx` — add **Online Courses** tile after Gallery.
- `src/components/CenterLayout` sidebar — add nav link after Gallery.
- `src/App.tsx` — routes `/center/online-courses` and `/center/online-courses/:courseId`.

## Bulk import behavior

- Accept `.xlsx` or `.csv`. Required columns (case-insensitive): `Chapter Name`, `Lecture Name`, `Youtube Link`. Optional: `subject`, `topic`.
- For each row:
  1. Find or create chapter by `Chapter Name` (within the selected course); inherit `subject` if provided.
  2. Extract YouTube ID from link (reject row if invalid).
  3. Upsert lesson by `(chapter, title)` — update `video_url`/`topic` if exists; else insert at next position.
- Show summary: created chapters, created lectures, updated lectures, skipped rows (with reasons).

## Out of scope (this turn)

- Public student-facing centre online course viewer page (data model is ready; UI can come next).
- Paid enrollments, certificates, progress tracking.

Confirm and I'll build it.
