## Goal

Stop forcing admins to define the curriculum at course creation time. Instead, let admins build the curriculum (chapters + lectures) inside the existing **Course Content** page (`/admin/course-content`) by adding lectures via private YouTube links that play inline on our platform.

## Changes

### 1. Remove curriculum from course creation — `src/pages/CreateCoursePage.tsx`

- In **create mode** (`!isEditMode`):
  - Remove the entire "Curriculum" card (chapters + lectures UI).
  - Drop the "Add at least one chapter" validation guard.
  - Skip the chapter/lesson insert loop and the totals update on create.
  - New courses are saved with no chapters/lessons — admin builds them later from Course Content.
- In **edit mode**: keep the existing curriculum editor as-is so legacy courses remain editable.
- Remove now-unused imports/helpers if they become dead in create mode (keep them; edit mode still uses them).

### 2. Add curriculum management to Course Content — `src/pages/AdminCourseContentPage.tsx`

Within the **selected course** view (after picking a course), add a new **Curriculum** section above the existing Resources section.

- **Layout**: list of chapters; each chapter shows its lectures (title, duration, YouTube preview link) with edit/delete; an "Add lecture" button per chapter and an "Add chapter" button at the top of the section.
- **Add Chapter dialog**: title input → inserts into `chapters` with next `position`.
- **Add Lecture dialog** (the requested "Add lectures" button), fields:
  - Lecture title (required)
  - YouTube URL (required) — accept full URL or short `youtu.be/...`; parse out the 11-char video ID; reject invalid input
  - Duration in minutes (optional, default 10)
  - Chapter selector (defaults to the chapter the button was clicked from)
  - "Free preview" toggle
  - On save: insert into `lessons` with `type='video'`, `video_url = https://www.youtube.com/embed/{id}` (canonical embed form for private/unlisted-friendly playback), `duration_seconds = minutes*60`, auto-generated unique `slug`, next `position` within that chapter.
- **Edit / delete**: inline edit of title/duration; delete with `useConfirm` confirmation.
- **Data loading**: extend `loadCourseDetail` to also fetch `lessons` for the course so chapters render with their lessons.

### 3. Player compatibility — `src/pages/LecturePlayerPage.tsx` (verify only, edit if needed)

Confirm the existing lecture player renders YouTube `embed` URLs via `<iframe>`. If it currently expects an MP4 `<video>`, add a branch: when `video_url` includes `youtube.com/embed/` or `youtu.be`, render a YouTube iframe (with `?rel=0&modestbranding=1`). This ensures private-listed YouTube lectures play inside our platform rather than redirecting to YouTube.

## Notes for the user

- "Private" YouTube videos cannot be embedded by third parties — only **Unlisted** videos can. Recommend uploading recordings as **Unlisted** on YouTube so the link is not publicly listed but the embed still works on our platform. The UI copy in the Add Lecture dialog will mention this.
- No database schema changes are needed — existing `chapters` and `lessons` tables already support this (`lessons.video_url`, `type`, `duration_seconds`, etc.).

## Files touched

- `src/pages/CreateCoursePage.tsx` — strip curriculum from create flow
- `src/pages/AdminCourseContentPage.tsx` — add Curriculum section + chapter/lecture dialogs
- `src/pages/LecturePlayerPage.tsx` — ensure YouTube embed playback (only if not already supported)
