## Goal
Remove subtopic folders from the course content hierarchy. Videos and PDFs sit directly under a topic. The subtopic value (if any) is shown as a small text label beneath each video's title — a dash `—` when absent.

New hierarchy: **Subject → Topic → Video / PDF** (with optional `subtopic_label` text on each).

## Database changes (migration)
1. Add `topic_id uuid` (nullable initially) and `subtopic_label text` to:
   - `subtopic_videos`
   - `subtopic_pdfs`
   - `subtopic_quizzes`
   - `subtopic_video_progress`, `subtopic_video_notes`, `subtopic_quiz_attempts` (topic_id only, for scoping)
2. Backfill:
   - `topic_id` ← parent subtopic's `topic_id`
   - `subtopic_label` ← parent subtopic's `name` (skip if name is `.`, `-`, blank)
3. Make `topic_id` NOT NULL; make `subtopic_id` nullable (keep column for now, ignored by UI).
4. Add FK `topic_id → course_topics(id) ON DELETE CASCADE` and indexes.
5. Update RLS policies referencing subtopics to use topic-based scoping.
6. Rename is cosmetic only — keep table names (`subtopic_videos` etc.) to avoid breakage; treat them as "topic content" in code.

## Admin Content Manager (`AdminCourseHierarchyPage.tsx`)
- Tree becomes 3-level: Subject → Topic → (no subtopic node).
- Selecting a topic shows: Topic name/description editor, tabs `Videos / PDFs / Quiz`, list of videos/PDFs.
- Add/Edit Video modal: add **Subtopic (optional)** text input, alongside title, YouTube ID, duration, preview flag.
- Bulk CSV upload (`BulkCourseVideosDialog` + template + `course-videos-template.csv`): replace `subtopic` folder column with `subtopic_label` text column; CSV maps row to `topic` + optional `subtopic_label`. Update parser accordingly.
- Drag-reorder still works within topic.
- Remove "+ Add Subtopic" buttons and subtopic CRUD UI.

## Student Learn page (`CourseLearnPage.tsx` + `course-content.ts`)
- `fetchCourseContentTree` returns Subjects → Topics → { videos, pdfs, quiz } (no subtopics array).
- Sidebar `ContentTree`: 3 levels. Videos render directly under topic with `subtopic_label || "—"` shown as caption.
- Video view breadcrumb: `Subject › Topic › {subtopic_label || "—"}`.
- Notes/quiz/progress keyed by `topic_id` instead of `subtopic_id`.
- "About" tab shows topic info; subtopic label appears as a small line under the title.

## Types
Update `src/types/course-content.ts`: remove `CourseSubtopic`; add `subtopic_label?: string | null` and `topic_id` to video/pdf/quiz types.

## Files to touch
- `supabase/migrations/<new>.sql`
- `src/types/course-content.ts`
- `src/lib/api/course-content.ts`
- `src/lib/course-progress.ts` (rollup at topic level)
- `src/pages/AdminCourseHierarchyPage.tsx`
- `src/pages/CourseLearnPage.tsx`
- `src/components/BulkCourseVideosDialog.tsx`
- `public/templates/course-videos-template.csv`

## Out of scope
- Renaming DB tables (`subtopic_*`) — stays as-is to limit blast radius.
- Deleting the `course_subtopics` table — kept for now, no longer used; can be dropped in a later cleanup once verified.

## Validation
- Run admin tree on the Nucleus JEE Class XII course: confirm 3 levels, videos show subtopic label or `—`.
- Open student learn page for the same course: sidebar collapses to topic→video, captions match.
- Re-upload a CSV with and without `subtopic_label` column.
