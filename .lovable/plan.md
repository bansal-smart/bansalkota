## Goal
Restructure the student portal around six things only — Home, My Course, My Live Class, My Live Test, My Progress, My Profile — gate it behind a one-time profile-completion popup, and swap the sidebar's flame mark for the real Bansal logo. Test engine itself stays exactly as-is.

## 1. Branding
- Replace the orange flame + "Bansal Classes" text in `StudentLayout` sidebar and mobile header with `<BansalLogo />` (uses `src/assets/bansal-logo.png`).

## 2. Profile completion popup (mandatory, one-time)
- New DB columns on `profiles`: `father_name text`, `state text`.  
  (Existing `class_level`, `target_exam`, `city`, `phone`, `full_name` reused. `onboarding_completed` already exists and is the gate flag.)
- New component `ProfileCompletionDialog.tsx` shown by `StudentLayout` whenever the logged-in student's `profiles.onboarding_completed = false`. Cannot be dismissed (no close button, no overlay click).
- Fields (all required except where noted):
  - Full Name
  - Email (read-only, from auth)
  - Phone
  - Father's Name
  - Class (dropdown: 8, 9, 10, 11, 12, Dropper)
  - Stream (dropdown: IIT-JEE, NEET, Pre Foundation)
  - City
  - State (dropdown of Indian states)
- On submit: update profile, set `onboarding_completed = true`, refresh auth profile, close dialog.
- Zod validation, trim + max-length per field.

## 3. Sidebar restructure
Replace existing nav groups in `StudentLayout` with a single flat list:

```text
Home          → /dashboard
My Course     → /my-courses
My Live Class → /my-live-classes
My Live Test  → /my-tests
My Progress   → /analytics
My Profile    → /profile
```

Removed from sidebar AND mobile bottom nav: Doubts, Mentor Chat, Compete, Leaderboard, Settings, Goal Selector, search bar in header. Routes stay registered (other pages may still link to them) but are no longer surfaced.

## 4. My Live Test (course-wise)
- Rename label to "My Live Tests".
- `MyTestsPage` (or its data hook) groups available tests by enrolled course. Layout: one collapsible card per enrolled course, listing its tests with the existing Start / Resume / View Result actions. Tests not tied to an enrolled course go under a "General Practice" group at the bottom.
- Test-taking, timer, autosave, and results pages are untouched.

## 5. Dashboard ("Home")
Trim `StudentDashboard` to: greeting, quick-resume of last lesson, today's live classes, upcoming live tests grouped by course, and a "My Progress" summary card (streak, accuracy, percentile, tests done) that deep-links to `/analytics`. Remove: "Talk to Counsellor", goal-setup card, mentor meeting card, compete shortcuts, weak-areas destructive panel (kept only inside `/analytics`).

## 6. My Course
`MyCoursesPage` becomes a directory: enrolled course cards → click into course → nested view:

```text
Course → Subject → Chapter → Topic → [PDFs · Video Lectures · Quizzes]
```

- Data comes from existing tables: `courses`, `chapters`, `lessons` (filtered by `type`: `video`, `quiz`, `pdf`), and `course_resources` (PDFs by `chapter_id`).
- New page `CourseStudyMaterialPage.tsx` at `/courses/:slug/study` with three tabs per topic: PDF, Video, Quizzes. Video tab links into the existing `LecturePlayerPage`; Quiz tab links into the existing test engine.

## 7. My Profile (editable)
- Strip the "Subscription" tab.
- Add Father's Name + State fields to the existing edit form. Class and Stream become dropdowns matching the popup.
- Avatar upload, email read-only — unchanged.
- Remove any "purchases / orders / plan" UI from profile and from anywhere else under the student shell.

## 8. Database migration (single file)
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS state text;
```
No new tables, no RLS changes — existing profile policies cover the new columns.

## Files touched
- `supabase/migrations/<new>.sql` — add two columns
- `src/components/StudentLayout.tsx` — logo, nav, mobile nav, header cleanup, mount popup
- `src/components/ProfileCompletionDialog.tsx` — **new**
- `src/pages/StudentDashboard.tsx` — slim down to Home content
- `src/pages/MyCoursesPage.tsx` — course directory entry
- `src/pages/CourseStudyMaterialPage.tsx` — **new** (subject → chapter → topic → PDF/Video/Quiz)
- `src/pages/MyTestsPage` (or equivalent) — group by enrolled course, rename
- `src/pages/ProfilePage.tsx` — add father_name + state, drop Subscription tab
- `src/App.tsx` — register `/courses/:slug/study` route
- `src/integrations/supabase/types.ts` — regenerated automatically after migration

## Out of scope
- Test engine internals (per request — stays identical).
- Doubts / Mentor / Compete / Leaderboard pages themselves (routes remain, just unlinked from sidebar).
- Admin-side course content authoring (uses existing admin pages).
