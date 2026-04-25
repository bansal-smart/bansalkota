## Goal
Replace static demo data on the Student Dashboard with real, per-user data from Supabase, persist goal/profile changes server-side, add a real notifications system, and make the profile page fully editable.

---

## 1. Database changes (one migration)

**New tables:**

- `notifications`
  - `id uuid pk`, `user_id uuid not null`, `title text not null`, `body text`, `type text` (e.g. `class`, `test`, `system`, `enrollment`), `link text`, `read_at timestamptz`, `created_at timestamptz default now()`
  - RLS: users can SELECT/UPDATE own (mark read); INSERT restricted to service_role and staff
  - Add to `supabase_realtime` publication

- `study_sessions` (powers streak + accuracy aggregates)
  - `id uuid pk`, `user_id uuid not null`, `session_date date not null`, `minutes_studied int default 0`, `questions_attempted int default 0`, `questions_correct int default 0`, `created_at timestamptz`
  - Unique `(user_id, session_date)`
  - RLS: users CRUD own

- `live_classes` + `live_class_attendance` (powers schedule + educators)
  - `live_classes`: `id`, `title`, `subject`, `educator_name`, `educator_avatar`, `target_exam`, `starts_at timestamptz`, `ends_at timestamptz`, `meeting_url`, `status` (scheduled/live/completed)
  - `live_class_attendance`: `id`, `user_id`, `class_id`, `joined_at`, `status` (registered/attended/missed)
  - RLS: classes readable by all authenticated; attendance per-user

- `educator_follows`
  - `id`, `user_id`, `educator_name`, `created_at`
  - RLS: users CRUD own

- `test_attempts` (for tests-completed + accuracy)
  - `id`, `user_id`, `test_name`, `score`, `total_questions`, `correct_answers`, `percentile`, `subject`, `attempted_at`
  - RLS: users CRUD own

**New columns on `profiles`:**
- `phone`, `date_of_birth date`, `city` already exist — add `bio text`, no extra needed

**Helper RPC:** `get_user_streak(_user_id uuid) returns int` — computes consecutive days from `study_sessions`.

---

## 2. Store changes — `src/store/useAppStore.ts`

- Remove localStorage persistence for `currentGoal` (server is source of truth)
- Add `notifications: Notification[]`, `unreadCount: number`, `setNotifications`, `markRead(id)`, `markAllRead`
- Keep `setCurrentGoal` but make it also write to Supabase profile when user is logged in

---

## 3. Goal persistence

- `GoalSelector` (sidebar dropdown): when user changes goal → optimistically update store + `UPDATE profiles SET goal = ? WHERE user_id = auth.uid()`. Toast on error and revert.
- `AuthContext.loadProfile` already pulls `goal` from profiles into store ✅ (keep)
- Remove the `localStorage.setItem('arke-goal', …)` line in the store

---

## 4. Onboarding progress tracker (new component)

`src/components/OnboardingTracker.tsx` — rendered above `GoalSetupCard` on dashboard.

Steps tracked (read from `profiles` + queries):
1. **Profile setup** — `full_name`, `phone`, `city` all non-null
2. **Exam goal** — `goal` non-null
3. **Schedule a class** — at least one row in `live_class_attendance` with status=registered
4. **First lesson** — at least one row in `lesson_progress`
5. **First test** — at least one row in `test_attempts`

UI: progress bar (e.g. 3/5) + checklist with green checks; click a pending item → navigates to relevant page. Auto-hides when 100% complete (with a "completed" celebration card for 24h via localStorage flag).

---

## 5. Notifications system

- Hook `useNotifications()` — fetches notifications for current user, subscribes to realtime INSERTs, exposes `markRead`, `markAllRead`, `unreadCount`.
- `StudentLayout` bell badge: read `unreadCount` from store (no longer static)
- New dropdown panel on bell click → list latest 10 notifications, mark-as-read on click, "View all" link
- `src/pages/NotificationsPage.tsx` (new) — full list with filters (all/unread)
- Seed a few notifications via the trigger: when a `live_classes` row goes live, insert notifications for users who registered (deferred — for now we'll just rely on app/admin-generated notifications and provide an admin "Send notification" path later)

---

## 6. Editable Profile page — `src/pages/ProfilePage.tsx`

- Replace static input fields with controlled form bound to Supabase `profiles`
- Editable fields: full_name, phone, date_of_birth, city, country, target_exam, goal, avatar
- **Avatar upload**: use existing `educator-uploads` bucket OR create new `avatars` bucket (public). Plan: create `avatars` bucket with public read + per-user folder write policy.
- On save: `UPDATE profiles ...` then refresh `AuthContext` profile loader so dashboard/sidebar update immediately (call a new `refreshProfile()` exposed from `AuthContext`).
- Stats tiles (Streak/Tests/Accuracy/Rank) wired to real queries
- Achievements: keep static for now (out of scope) but mark as "Coming soon" gracefully

---

## 7. Dashboard widgets — replace demo data

`src/pages/StudentDashboard.tsx`:

| Widget | Data source |
|---|---|
| Current Streak | RPC `get_user_streak` |
| Overall Accuracy | `SUM(correct)/SUM(attempted)` from `study_sessions` |
| Tests Completed | `count(*) from test_attempts` |
| All India Percentile | `avg(percentile)` from last 5 `test_attempts` (or latest) |
| Continue Watching | `lesson_progress` ordered by `last_watched_at desc limit 2` joined with `courses` |
| Today's Schedule | `live_classes` where `starts_at::date = today` joined with attendance |
| Top Educators | `educator_follows` for user, fallback to top by enrollment count |
| Score Trend | aggregated `test_attempts` over last 6 weeks |
| Subject Performance | `test_attempts` grouped by subject (avg correct%) |
| Weak Topics | derived from low-accuracy subjects in `test_attempts` (simple heuristic for now) |
| Upcoming Tests | static for now → leave as "no data" empty state until a `tests` table exists (out of scope to seed) |

For widgets with no data yet, show friendly empty states ("No tests yet — take your first one") instead of fake numbers.

---

## 8. Files to create/edit

**Create:**
- `src/components/OnboardingTracker.tsx`
- `src/components/NotificationBell.tsx` (dropdown)
- `src/hooks/useNotifications.ts`
- `src/hooks/useDashboardData.ts` (centralizes all dashboard queries)
- `src/pages/NotificationsPage.tsx`
- Migration file for new tables + RLS + storage bucket

**Edit:**
- `src/store/useAppStore.ts` — drop goal localStorage, add notification state
- `src/context/AuthContext.tsx` — expose `refreshProfile()`
- `src/components/StudentLayout.tsx` — wire bell to `NotificationBell`
- `src/components/GoalSelector.tsx` — persist to Supabase
- `src/pages/StudentDashboard.tsx` — consume `useDashboardData`, render real widgets + `<OnboardingTracker/>`
- `src/pages/ProfilePage.tsx` — full edit form + avatar upload
- `src/App.tsx` — add `/notifications` route

---

## Out of scope (flag for later)
- Admin UI to author notifications (will come with broader admin work)
- Seeding `live_classes` and `test_attempts` with starter content — empty states will show until you (or admins) create rows
- Achievements engine — kept static