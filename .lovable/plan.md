## Goal
Replace the hardcoded mock data in `TeacherDashboard.tsx` with real data scoped to the logged-in teacher.

## Data Sources (per teacher = `auth.uid()`)
- **Total Students**: distinct `enrollments.user_id` where `enrollments.course_id` ∈ courses created by the teacher. "+N new this week" = enrollments created in last 7 days.
- **Active Courses**: count of `courses` where `created_by = teacher` AND `is_published = true`.
- **Pending Doubts**: count of `doubts` where `assigned_teacher_id = teacher` AND `status = 'pending'` (fallback: all pending doubts in subjects the teacher teaches).
- **Avg Rating**: from `courses.rating` of teacher's courses (weighted by `total_enrolled`). Show total enrollments as the "based on" line.
- **Upcoming Classes**: `live_classes` where `created_by = teacher`, `starts_at >= now() OR status = 'live'`, ordered by `starts_at`, limit 3. Show "Today/Tomorrow/Date" labels and "Join/Start Now" if `status = 'live'`.
- **Pending Doubts list**: latest 3 `doubts` (assigned to teacher OR unassigned in teacher's subjects), with student name from `profiles.full_name`. "Urgent" if older than 6h.
- **Score Distribution**: bucket `test_attempts.score` for attempts on tests where `tests.created_by = teacher` (last test by `created_at`). 5 buckets across the test's `total_marks`.
- **Greeting**: "Good morning/afternoon/evening, {profile.full_name}" based on local time. Subtitle: count of new enrollments today.
- **Earnings card**: KEEP as static placeholder for now (no payments table for teacher payouts exists) — labeled "Sample" so it's clearly mock. Will be wired when payouts model is added.

## Quick Actions
Make the "Answer Doubts" desc dynamic ("{N} pending"). Keep links as-is.

## Implementation
1. Create `src/hooks/useTeacherDashboard.ts` returning:
   - `loading`, `stats {totalStudents, newThisWeek, activeCourses, pendingDoubts, avgRating, totalReviews}`, `upcomingClasses[]`, `pendingDoubts[]`, `scoreDistribution[]`, `lastTestTitle`, `greetingName`, `newToday`.
   - Single `useEffect` runs parallel queries:
     - `courses` filtered by `created_by = user.id` → derive course IDs + ratings.
     - `enrollments` filtered by `course_id IN courseIds` (chunked `.in()`).
     - `doubts` count + latest 3 (assigned or unassigned matching teacher subjects).
     - `live_classes` filtered by `created_by` + `starts_at >= now()` ordered ascending, limit 3.
     - `tests` latest by teacher → `test_attempts` for that test → bucket scores.
     - `profiles` for current user (full_name).
     - For doubts list, fetch `profiles.full_name` for `user_id` set in a second small query.

2. Refactor `src/pages/TeacherDashboard.tsx`:
   - Remove all hardcoded constants except the static earnings sample (mark "Sample data").
   - Use `useTeacherDashboard()`; show `Skeleton` placeholders while `loading`.
   - Empty states: "No upcoming classes", "No pending doubts — you're all caught up!", "No test attempts yet".
   - Compute "Today/Tomorrow/{date}" + 12h time format from `starts_at` with a tiny helper.

3. No DB schema changes required — all needed tables and RLS policies already exist (teacher role can read own courses/enrollments/doubts/live_classes/tests/test_attempts via existing policies).

## Files to Edit / Create
- Create: `src/hooks/useTeacherDashboard.ts`
- Edit: `src/pages/TeacherDashboard.tsx`

## Out of Scope
- Real teacher earnings/payout (no data model exists).
- Realtime subscriptions (initial load is sufficient; can be added later if desired).
