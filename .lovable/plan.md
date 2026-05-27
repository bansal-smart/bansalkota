# Study Material polish + Video back-nav fix

## 1. Back navigation from video → Study Material

**Problem**: Opening a lesson goes to `/courses/:slug/learn?lesson=…`. The player's back link sends users to `/courses/:slug` (course detail / sales page) instead of `/my-courses/:slug` (study material).

**Fix in `src/pages/LecturePlayerPage.tsx`**:
- Replace the two `navigate(\`/courses/${slug}\`)` fallbacks and the "Back to My Courses" link with `navigate(\`/my-courses/${slug}\`)`.
- Add a visible top "Back to Study Material" button (ArrowLeft icon) that routes to `/my-courses/:slug`, preserving chapter scroll via `location.state` (pass `{ chapterId }` from the study page link, then on back navigate with that state so the chapter auto-expands).

**Fix in `src/pages/CourseStudyMaterialPage.tsx`**:
- When rendering each lesson `<Link>`, pass `state={{ from: 'study', chapterId: ch.id }}` so the player knows where to return.

## 2. Study Material page redesign (`CourseStudyMaterialPage.tsx`)

Keep data model intact; only presentation changes.

### Header
- Replace plain gradient header with a layered hero: course title, instructor avatar + name, progress ring (overall completion %), and a compact stats row (Chapters · Videos · Quizzes · PDFs).
- Breadcrumb: My Courses › {Course}.

### Subject visual system
Add a `SUBJECT_THEME` map keyed by subject name (Physics, Chemistry, Mathematics, Biology) with:
- Lucide icon (Atom, FlaskConical, Sigma, Leaf)
- HSL gradient token pair (use semantic tokens; add `--subject-physics`, `--subject-chemistry`, `--subject-math`, `--subject-bio` in `index.css` + tailwind config)
- Soft background illustration (CSS pattern, no external assets)

Render subjects as tabs/pills at the top; each shows its icon, name, and chapter count with the themed gradient.

### Chapter list
- Replace flat cards with an accordion grid (one column on mobile, two on `lg`).
- Each chapter card: number badge, title, mini progress bar, counts (▶ videos · 📄 pdfs · ✓ quizzes) using Lucide icons only.
- Expanded state shows three tabs inside the card: **Video Lectures · PDFs · Quizzes**.

### Lesson rows
- Uniform row height, left icon (PlayCircle / FileText / ClipboardCheck), title, duration / pages, right-side status chip (Not started / In progress / Completed) and a primary action button.
- Hover: subtle lift, focus ring uses `--ring`.
- Empty states per tab with a friendly illustration block.

### Pagination
- If a chapter has >6 items in a tab, paginate with shadcn `Pagination` component (6 per page). State kept per chapter+tab in a `Map`.

### Student avatar / personalization strip
- Above the chapter list, a slim "Continue where you left off" strip: student avatar (from profile), last-watched lesson thumbnail, resume button.

### Alignment & spacing pass
- Container `max-w-6xl mx-auto px-4 lg:px-6`, consistent `gap-6`, `py-8`.
- All icons `h-4 w-4` inline / `h-5 w-5` in headers.
- Cards use `rounded-2xl border bg-card shadow-sm`.

## 3. Tokens
Add to `src/index.css` (`:root` + `.dark`) and `tailwind.config.ts`:
```
--subject-physics, --subject-physics-foreground
--subject-chemistry, --subject-chemistry-foreground
--subject-math, --subject-math-foreground
--subject-bio, --subject-bio-foreground
```
All HSL. No raw hex in components.

## Files touched
- `src/pages/LecturePlayerPage.tsx` (back nav)
- `src/pages/CourseStudyMaterialPage.tsx` (full UI rebuild, data fetch unchanged)
- `src/index.css`, `tailwind.config.ts` (subject tokens)
- New: `src/components/study/SubjectTabs.tsx`, `ChapterCard.tsx`, `LessonRow.tsx`, `ResumeStrip.tsx`

No DB / business-logic changes.
