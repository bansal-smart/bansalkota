## Goal

Make the teacher portal fully dynamic: connect Students, Analytics, Settings, and the dashboard's upcoming classes + earnings card to real Supabase data, replacing all mock data. Add Join/Start actions for live classes and a clear "Earnings (soon)" placeholder with a payouts setup request.

## 1. Dashboard — Upcoming classes Join/Start buttons

In `src/pages/TeacherDashboard.tsx`:
- Replace the current `Edit` / `Start Now` link with a smarter action per class:
  - If `status === 'live'` AND `meeting_url` exists → "Join Live" button that opens `meeting_url` in a new tab.
  - If upcoming (starts within 15 min) AND `meeting_url` exists → "Start Class" button that opens `meeting_url` and updates status to `live` (best effort via `update` on `live_classes`).
  - If no `meeting_url` → "Add Link" link to `/teacher/live-classes`.
  - Otherwise → "Edit" link (existing fallback).
- Keep the in-app `/live/:id` route as a secondary text link "Open Room" beside the primary action.

## 2. Dashboard — Earnings (soon) card

Replace the current "Earnings This Month — Sample" card with a clearly labeled placeholder:
- Title: "Earnings (coming soon)" with a small Lucide `Clock`/`Wallet` icon.
- Body: short note that payouts are not yet enabled and are tracked manually for now.
- Primary button: "Request Payouts Setup" → inserts a row into `enquiries` table with `source='payout_setup'`, prefilled name/email/phone from teacher's profile, message "Please enable payouts for my account." On success show toast "Request sent — our team will reach out within 2 business days." Disable button + show "Request submitted" if a payout enquiry already exists for this teacher email.
- Remove the static `dailyEarnings` chart entirely (no fake numbers).

## 3. Students tab — fully dynamic

Rewrite `src/pages/TeacherStudentsPage.tsx` using a new hook `src/hooks/useTeacherStudents.ts`:

Data flow:
1. Fetch courses where `created_by = auth.uid()` → list of `course_ids` with names.
2. Fetch `enrollments` for those courses (`user_id, course_id, progress_percent, completed_lessons, last_accessed_at, created_at`).
3. Fetch `profiles` for those `user_id`s (`full_name, target_exam, avatar_url`).
4. Fetch `test_attempts` for those `user_id`s where `test_id` belongs to teacher's tests; aggregate per student → `testsCompleted` (count of submitted) and `avgScore` (mean of `score / total_marks * 100`).

Render:
- Header stats: Total students (unique enrollments), Avg progress (mean of `progress_percent`), Avg score (mean across attempts).
- Search box filters by name/course.
- Table rows show: avatar/initials, name, course/batch (course name), progress bar from `progress_percent`, avg score, tests completed, last active (`last_accessed_at` formatted relatively).
- Empty state when teacher has no enrollments.
- Skeleton loaders while fetching.

## 4. Analytics tab — dynamic

Rewrite `src/pages/TeacherAnalyticsPage.tsx` using a new hook `src/hooks/useTeacherAnalytics.ts`:

Stat cards:
- Total Students = unique enrollment user_ids.
- Total Revenue = sum of `courses.price * total_enrolled` across teacher's published courses (labelled "Estimated, gross"). If 0, show "—".
- Lecture Views = count of `lesson_progress` rows for lessons in teacher's courses (proxy for views).
- Avg Test Score = mean of `(score/total_marks)*100` across `test_attempts` for teacher's tests.

Charts:
- Engagement (last 7 days): per day, count of `lesson_progress` rows (`last_watched_at`) as `views` and count of `doubts` (created_at, subject in teacher subjects OR assigned_teacher_id = teacher) as `doubts`.
- Revenue trend (last 6 months): per month, sum of `enrollments.created_at` × matching `courses.price`. Labelled "Estimated".
- Course Distribution (Pie): teacher's courses by `total_enrolled` share; color cycled from theme palette.
- Top Performing Students: top 4 students by avg test score across teacher's tests.

Empty / loading states for each card and chart.

## 5. Settings tab — dynamic

Rewrite `src/pages/TeacherSettingsPage.tsx`:

Profile section:
- Load `full_name`, `phone` from `profiles` and `email` from `auth.user`.
- Save → `update profiles set full_name, phone where user_id = auth.uid()`. Toast on success.

Payout Settings section:
- Replace hardcoded "HDFC ****4521" with a clear "Payouts not yet configured" empty state.
- Button "Request Payouts Setup" reuses the same `enquiries` insert as the dashboard card.

Notifications section:
- Persist toggles in `localStorage` keyed by user id (no schema change). Note: a future migration could move this to a `user_preferences` table.

Security section:
- "Change Password" → call `supabase.auth.updateUser({ password })` via a small dialog with current/new password fields and confirmation. On success, toast and sign out.

## 6. Files

Create:
- `src/hooks/useTeacherStudents.ts`
- `src/hooks/useTeacherAnalytics.ts`

Edit:
- `src/pages/TeacherDashboard.tsx` (Join/Start buttons, replace earnings card)
- `src/hooks/useTeacherDashboard.ts` (no changes needed; already exposes `meeting_url`)
- `src/pages/TeacherStudentsPage.tsx` (full rewrite, dynamic)
- `src/pages/TeacherAnalyticsPage.tsx` (full rewrite, dynamic)
- `src/pages/TeacherSettingsPage.tsx` (dynamic profile, payout request, password change)

No database migrations required — all data sourced from existing tables (`profiles`, `courses`, `enrollments`, `lesson_progress`, `test_attempts`, `tests`, `live_classes`, `doubts`, `enquiries`).

## Notes on labelling

Revenue and views are labelled "Estimated" since true payment/view tracking isn't yet implemented. This keeps the dashboard honest while still being useful and dynamic.
