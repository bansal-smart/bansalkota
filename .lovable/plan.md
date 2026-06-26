# Course Content Restructure: Subject → Topic → Subtopic → Videos

Replace the current `Chapter → Lesson` model with a 4-level hierarchy nested under each course. Stream stays on `courses.target_exam` — no schema change to `courses`.

## Scope

**New tables** (10): `course_subjects`, `course_topics`, `course_subtopics`, `subtopic_videos`, `subtopic_pdfs`, `subtopic_quizzes`, `subtopic_quiz_questions`, `subtopic_quiz_attempts`, `subtopic_video_progress`, `subtopic_video_notes`. Plus `course_resources.subtopic_id`.

**Kept untouched**: `courses`, `course_batches`, `enrollments`, `course_reviews`, `course_enquiries`, `module_packs`, `module_pack_items`, `lecture_bucket`.

**Legacy kept for now** (NOT dropped): `chapters`, `lessons`, `lesson_progress`, `lesson_notes`, `chapter_quizzes*`, `course_pdfs`. Drop SQL is added as a commented block to run after data migration.

## Step 1 — Database migration

One migration with the full schema from your spec, adapted to project conventions:

- `CREATE TABLE` → `GRANT SELECT,INSERT,UPDATE,DELETE … TO authenticated; GRANT ALL … TO service_role` → `ENABLE RLS` → policies.
- Role checks use this project's pattern (`public.has_role(auth.uid(),'admin'::app_role)` / `'super_admin'` / `'teacher'`), not the `profiles.role` shorthand in the spec.
- Content SELECT policy: enrolled in course (active enrollment) OR admin/super_admin/teacher; videos additionally allow `is_preview = true`.
- Content write policy: admin/super_admin/teacher only.
- User tables (`subtopic_video_progress`, `subtopic_video_notes`, `subtopic_quiz_attempts`): `user_id = auth.uid()` for ALL.
- Add `updated_at` triggers using existing `public.update_updated_at_column()` on the 3 hierarchy tables.
- Indexes per spec.

## Step 2 — Types & utilities

- `src/types/course-content.ts` — all interfaces from the spec.
- `src/lib/youtube.ts` — `extractYouTubeId`, `getYouTubeThumbnail`, `getYouTubeEmbedUrl`.
- `src/lib/course-progress.ts` — `calcProgress`, `rollupCourseProgress`.
- `src/lib/api/course-content.ts` — `fetchCourseContentTree`, `upsertVideoProgress`, plus CRUD helpers for subjects/topics/subtopics/videos/pdfs/quizzes and a `reorderSiblings` batch-position updater.

## Step 3 — Admin: Content Manager

New route `/admin/courses/:courseId/content` (page `src/pages/AdminCourseContentPage.tsx` is repurposed; old chapter UI removed).

Components under `src/components/admin/content/`:
- `ContentTree.tsx` — `@dnd-kit/sortable` tree with expand/collapse, inline rename, ⋮ menu (rename / move up-down / delete with confirm), localStorage state `admin_tree_[courseId]`.
- `ContentEditor.tsx` — switches on selected node type.
- `SubjectEditor.tsx`, `TopicEditor.tsx`, `SubtopicEditor.tsx` with breadcrumbs & stats.
- `VideoTab.tsx` — list + add-via-YouTube-URL dialog (auto thumbnail from `extractYouTubeId`, oEmbed title best-effort, `is_preview` toggle), drag reorder.
- `PdfTab.tsx` — list + add dialog (URL or Supabase Storage upload using existing pattern).
- `QuizTab.tsx` — single-quiz-per-subtopic; create/edit/delete + `Manage Questions` sheet reusing the existing MCQ editor pattern against `subtopic_quiz_questions`.
- Admin sidebar link "Chapters" → "Content"; old chapter routes removed.
- "Preview as Student" button opens `/learn/:courseId` in a new tab.

## Step 4 — Student: Learning Interface

Route `/learn/:courseId?video=:videoId` (replaces old lesson-based route). Page `src/pages/CourseLearnPage.tsx`.

- Access guard: must have active `enrollments` row OR target video has `is_preview=true` OR admin/teacher; otherwise redirect to course detail.
- Desktop layout: 280px sticky `ContentSidebar.tsx` (progress bar + nested tree with ○/◑/● indicators, auto-scroll to active video, localStorage `learn_tree_[courseId]_[userId]`) + main area.
- Mobile (<768px): hamburger opens tree in a bottom Sheet (85vh).
- Main area:
  - No video: course hero + Continue Learning (queries `subtopic_video_progress` ordered by `last_accessed_at desc`).
  - With video: breadcrumb, YouTube nocookie iframe (16:9), title/duration, Mark Complete toggle, auto-complete on YouTube `onStateChange === 0` via postMessage listener, upsert `last_accessed_at` on load.
- Tabs: Notes (debounced 1.5s autosave to `subtopic_video_notes`), PDFs (from `subtopic_pdfs`), Quiz (fullscreen NTA-style modal writing to `subtopic_quiz_attempts`), About.

## Step 5 — Terminology pass

Across new admin + student UI strings: "Chapter" → "Topic", "Lesson" → "Video", "Chapter Quiz" → "Subtopic Quiz". Legacy pages that still reference old tables are left as-is until data migration runs.

## Out of scope (call out)

- No automatic data migration from `chapters/lessons` → new tables. Spec keeps old tables alive; a future migration script can backfill.
- `courses.total_lessons` and `sync_enrollment_progress()` continue to use the legacy lesson tables; enrollment % on the new model will be added later (rolled up client-side in the new UI for now).
- `course_pdfs` admin UI continues to work against the old table until migration.

## Technical details

- Postgres: all FKs `ON DELETE CASCADE` per spec. `subtopic_quizzes` has `UNIQUE(subtopic_id)`. `subtopic_quiz_questions.correct_option` CHECK in ('a','b','c','d').
- RLS rewrite of spec example: replace `EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin','teacher'))` with `public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR public.has_role(auth.uid(),'teacher'::app_role)`.
- GRANTs: every new public table gets `GRANT SELECT,INSERT,UPDATE,DELETE TO authenticated` and `GRANT ALL TO service_role`. No `anon` grants (all access is authenticated).
- `subtopic_videos` SELECT policy adds the `is_preview = true` branch.
- DnD: existing `@dnd-kit` usage in `AdminCoursesPage`/`AdminBooksPage` is the reference; reorder writes batch update via RPC-less `upsert` of `{id, position}`.
- YouTube oEmbed call from admin client is best-effort; failure leaves title blank for manual entry — no server proxy added.

## Confirmations before I start

1. Keep old `chapters/lessons/...` tables and their admin pages alive (read-only-ish) until you separately ask to drop them — correct?
2. Pricing/enrollment unaffected — students still buy the `course`, and the new content unlocks for active enrollments. OK?
3. Quiz scoring: MCQ-single only with marks/negative marks per question, computed client-side on submit (matches spec). OK?

If yes to all three, I'll implement Steps 1-5 in that order, starting with the migration.
