# Plan: Subject-first study flow, video player polish, real quizzes, richer dashboard

## 1. Subject picker before topics (Course Study Material)

Currently `/my-courses/:slug` jumps straight into chapter accordions. Add a subject-selection step.

- New state `selectedSubject` in `src/pages/CourseStudyMaterialPage.tsx`.
- Derive subject list from the course's exam:
  - JEE / JEE Main / JEE Advanced → Physics, Chemistry, Mathematics
  - NEET → Physics, Chemistry, Biology
  - Foundation / others → fall back to the course's own subject, or all four
- Step 1 view: a grid of large subject cards (icon + name + chapter count + progress bar), using existing `SUBJECT_THEME` tokens (`subject-physics`, `subject-chemistry`, `subject-math`, `subject-bio`).
- On click → set `selectedSubject`, render existing chapters UI filtered to that subject.
- Chapters need a subject tag. Use `chapters.subject` column if present; otherwise derive from chapter title keywords (Physics/Chem/Math/Bio) as a fallback. Add a small migration to ensure `chapters.subject text` exists (nullable) so future authoring is clean.
- Breadcrumb at top: `My Courses › <Course> › <Subject>` with a "Change subject" button.
- Persist last picked subject in `localStorage` keyed by course slug so returning users land on the same subject.

## 2. Video player + page alignment (LecturePlayerPage)

- Fix layout: 2-column grid on `lg` (player 2fr, sidebar 1fr), single column on mobile. Player wrapped in `aspect-video` with `rounded-2xl overflow-hidden bg-black` so YouTube iframe never overflows.
- Sticky top bar with `ArrowLeft` "Back to Study Material" (already wired to `/my-courses/:slug`) + lesson title + chapter chip.
- Below player: tabs for **Overview · Notes · Resources · Quiz** (Quiz tab links to the chapter's quiz from step 3).
- Right sidebar: chapter playlist with current lesson highlighted, completion ticks, next-lesson CTA.
- Use semantic tokens only (`bg-card`, `text-foreground`, `border-border`, `ring-ring`).

## 3. Quizzes after each chapter (seed + UI)

Backend (one migration):
- Ensure `chapter_quizzes` and `chapter_quiz_questions` exist with `chapter_id`, `title`, `question`, `options jsonb`, `correct_index`, `explanation`, `position`. Use existing `test_attempts` pattern? Simpler: dedicated lightweight tables since these are auto-graded MCQs tied to a chapter.
- Seed 5 MCQs per chapter for the sample course (`nucleus-jee-main-advanced`) covering Physics/Chem/Math.
- RLS: enrolled students can read; admins can write. Grants for `authenticated` + `service_role`.

Frontend:
- New route `/my-courses/:slug/chapters/:chapterId/quiz`.
- `ChapterQuizPage.tsx`: one question at a time, progress bar, timer (optional), instant scoring on submit, "Review answers" screen with explanations.
- Replace the existing "Quizzes" tab in Study Material so each chapter shows real quizzes with a Start button + last score badge.
- Store attempt in a new `chapter_quiz_attempts` table (user_id, quiz_id, score, total, answers jsonb).

## 4. Dashboard redesign with charts

`src/pages/StudentDashboard.tsx` — keep the hero but add:
- **Stats strip**: 4 KPI cards (Streak days, Hours this week, Tests taken, Avg score) with mini sparkline using `recharts` (already a likely dep — verify; if not, add).
- **Weekly study chart**: bar chart of minutes/day for last 7 days (from `study_sessions`).
- **Subject mastery radar**: radar chart across Physics/Chem/Math/Bio using avg quiz/test scores.
- **Progress ring grid**: per enrolled course donut.
- **Upcoming row**: next live class + next test cards with countdown chips.
- **Leaderboard / percentile teaser**: small card linking to analytics.
- Lottie-free, all chart colors from semantic tokens (`--primary`, `--subject-*`).
- Mobile: stack into single column; keep 16px gutters.

## Files

- Edit: `src/pages/CourseStudyMaterialPage.tsx`, `src/pages/LecturePlayerPage.tsx`, `src/pages/StudentDashboard.tsx`, `src/App.tsx`
- New: `src/components/study/SubjectPicker.tsx`, `src/pages/ChapterQuizPage.tsx`, `src/components/dashboard/{StatStrip,WeeklyStudyChart,SubjectRadar,CourseProgressGrid}.tsx`
- Migration: chapter subject column (if missing) + `chapter_quizzes`, `chapter_quiz_questions`, `chapter_quiz_attempts` with GRANTs + RLS, and seed inserts for the sample course.

## Out of scope

No business-logic changes to enrollments, payments, or auth. Existing course/lesson data model untouched besides the optional `chapters.subject` column and the new quiz tables.

## Confirm before I build

1. OK to add the new quiz tables + seed 5 MCQs per chapter for the sample JEE course?
2. For JEE courses, show all three subjects (Phy/Chem/Math) even if some chapters aren't tagged yet (untagged chapters appear under the course's primary subject)?
