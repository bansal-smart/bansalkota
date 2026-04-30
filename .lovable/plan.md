## Goal

1. Give teachers a real "Go Live" classroom page where they host the class in realtime alongside students (video, live chat, attendee count, start/end controls).
2. Make the student-side live class room and dashboards/tables fully responsive across desktop and tablet sizes (>=768px).
3. Confirm Question Bank tab is gone from the student's panel (it already is — no further work needed there beyond a final sweep).

---

## 1. Teacher Live Classroom (new realtime host page)

Currently `TeacherLiveClassesPage` is only a scheduler/CRUD list — there is no page where the teacher actually hosts the class. Students already have `LiveClassRoomPage` at `/live-classes/:id` with chat, attendance count, and embedded meeting iframe. Teachers need an equivalent host room.

### New page: `src/pages/TeacherLiveClassRoomPage.tsx`

Route: `/teacher/live-classes/:id` (inside `TeacherLayout` + `ProtectedRoute allow={["teacher"]}`).

Layout (split-pane on desktop/tablet, stacked on smaller):
```text
+-----------------------------------------------+----------------+
| [Back]  Title  [LIVE badge]   [Start][End]    |  Live chat     |
|                                               |  (teacher tag) |
| +-------------------------------------------+ |  participants  |
| | Embedded meeting iframe (meeting_url)     | |  + msg list    |
| | Aspect 16:9                               | |  + composer    |
| +-------------------------------------------+ |                |
| Class info: subject, course, scheduled time   |                |
| Attendees panel (collapsible): list + count   |                |
+-----------------------------------------------+----------------+
```

Reuses the existing tables — no schema change required:
- `live_classes` (status, meeting_url, recording_url)
- `live_class_messages` (realtime chat — already in `supabase_realtime` publication)
- `live_class_attendance` (joined students)

Behavior:
- **Auth gate**: only the `created_by` teacher (or staff) can open the host page; otherwise redirect with toast.
- **Start class**: button updates `live_classes.status` from `scheduled` → `live` and stamps a `started_at` (reuse `starts_at` if needed; no new column). Triggers the existing realtime channel so students immediately see "Live now" on `LiveClassesListPage` (already wired via `useLiveClasses`).
- **End class**: sets `status` → `completed` and optionally accepts a `recording_url` input that gets saved.
- **Live chat**: identical Supabase channel as the student page but inserts with `is_teacher: true` so messages render with the TEACHER pill already supported in `LiveClassRoomPage`.
- **Attendees**: `select` from `live_class_attendance` joined to `profiles` for names; live-updated via the same `postgres_changes` channel that the student page uses. Shows count + scrollable list.
- **Meeting frame**: same iframe pattern (`meeting_url`) with "Open in new tab" fallback. The teacher is the host inside Jitsi/Meet/Zoom — we don't try to control video from React.

### Wiring

- Add route in `src/App.tsx` under the teacher block:
  ```
  <Route path="/teacher/live-classes/:id" element={<TeacherLiveClassRoomPage />} />
  ```
- In `TeacherLiveClassesPage.tsx`, add a primary action on each row:
  - "Go Live" button (when `status === scheduled` and starts within 15 min, or always allow) → navigates to `/teacher/live-classes/:id`.
  - "Resume" when `status === live`.
  - Existing "Mark complete" / delete remain.

### Realtime + RLS notes

The `live_classes` UPDATE policy already restricts to teachers/staff (see migration `20260427070429`). `live_class_messages` INSERT policy permits authenticated users; teacher messages just set `is_teacher: true` client-side, mirroring the existing student flow. No new migration needed.

---

## 2. Question Bank in the student panel

Already removed in the prior change set:
- `StudentLayout.tsx` nav lists (Main / Explore / Account) contain no QBank entry.
- `StudentDashboard.tsx` quick actions don't reference it.
- `App.tsx` has no `/qbank` route; `src/pages/QBankPage.tsx` was deleted.

Action: do a final `rg` sweep before finishing to ensure no leftover student-facing reference remains. (Currently only teacher routes/components reference Question Bank, plus a marketing string in `StorePage.tsx` — that's fine.) No code change expected here unless the sweep finds something stray.

---

## 3. Responsive sweep (desktop + tablet)

Target widths: 768, 820, 1024, 1280, 1366, 1536, 1920. Mobile (<768) is explicitly out of scope per user note.

### Student dashboard (`StudentDashboard.tsx`)
- Right "My Performance" panel currently shows only at `xl` (>=1280). At 1024-1279 the dashboard feels empty on the right and the main column stretches too wide. Switch to `lg:block w-[260px]` so the panel appears from 1024px+.
- Convert quick actions / stats grids to clean breakpoints: `grid-cols-2 md:grid-cols-4` for both rows so tablets show all four side-by-side.
- "Continue Watching" and "Educators" grids: `sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3` — already mostly there, normalize to `md:` breakpoints.
- Header greeting row: ensure CTAs wrap cleanly with `flex-wrap` and shrink CTA padding at `md`.

### Student Live Classroom (`LiveClassRoomPage.tsx`)
- Currently the chat sidebar only splits at `lg`. Drop to `md:` so tablets get the side-by-side video+chat experience: `flex-col md:flex-row`, `md:w-[300px] lg:w-[340px]`.
- Constrain the video container `max-h-[calc(100vh-120px)]` on `md+` so 16:9 doesn't push the chat off-screen on shorter tablets.

### Teacher pages
- `TeacherLiveClassesPage`: list cards already wrap; tighten action buttons to wrap on tablet. Add the new "Go Live" button.
- `TeacherDashboard`, `TeacherStudentsPage`, `TeacherAnalyticsPage`, `TeacherCoursesPage`: confirm any data tables wrap in `overflow-x-auto` containers and stat grids use `md:grid-cols-2 lg:grid-cols-4`.
- `CreateTestPage`: already split at `lg`. Add a `md:` sheet trigger so tablets between 768-1023 can open the question bank as a side sheet (existing `Sheet` component already used for mobile — just lower its breakpoint to `lg:hidden` from `md:hidden` if needed).

### Admin
- `AdminDashboard`, `AdminUsersPage`, `AdminPaymentsPage`, etc.: ensure `<table>` wrappers use `overflow-x-auto`, and stat grids step `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Quick visual pass — most are already correct.

### Verification

After implementation, use the browser tool at viewports 768x1024, 1024x768, 1280x720, 1366x768, 1536x864 to spot-check:
1. `/dashboard` (student)
2. `/my-live-classes` and a `/live-classes/:id` room
3. `/teacher/dashboard`, `/teacher/live-classes`, `/teacher/live-classes/:id` (new)
4. `/teacher/tests/create`
5. `/admin/dashboard`, `/admin/users`

---

## Files to create / edit

**Create**
- `src/pages/TeacherLiveClassRoomPage.tsx` — new realtime host room.

**Edit**
- `src/App.tsx` — add `/teacher/live-classes/:id` route + import.
- `src/pages/TeacherLiveClassesPage.tsx` — add "Go Live" / "Resume" buttons linking to the host page; minor responsive tidy.
- `src/pages/LiveClassRoomPage.tsx` — drop chat-split breakpoint from `lg` to `md`.
- `src/pages/StudentDashboard.tsx` — show right panel from `lg:` instead of `xl:`, normalize grid breakpoints.
- `src/pages/CreateTestPage.tsx` — verify `Sheet` trigger behavior on tablet.
- Light responsive touch-ups (only if the QA pass reveals issues) on: `TeacherDashboard.tsx`, `TeacherStudentsPage.tsx`, `TeacherAnalyticsPage.tsx`, `AdminDashboard.tsx`, `AdminUsersPage.tsx`.

**No DB migration needed** — `live_classes`, `live_class_messages`, `live_class_attendance` already exist with RLS + realtime publication.
