## Mentor Announcements + Backup Mentor Pool

Two features for the mentor portal: (1) meeting announcements with RSVP and recurrence, (2) backup mentor pool with admin-triggered handover.

---

### Feature 1 — Meeting Announcements with RSVP

**What mentors can do**
- From the Mentor Dashboard, open "Announce a meeting" panel.
- Fill: title, date & time, duration, meeting URL, agenda/notes, recurrence (`one_off`, `weekly`, `fortnightly`, `monthly`, `custom_days`).
- On save: announcement is created, all assigned students get an in-app notification + email, and it appears in their Student Dashboard "Upcoming with your mentor" card.
- Mentor sees a list of upcoming + past announcements with RSVP counts (Attending / Can't make it / No response) and can edit, cancel, or mark complete.

**What students see**
- New "Mentor Meetings" widget on Student Dashboard with the next meeting, time, join link, and RSVP buttons (Attending / Can't make it).
- Notification + email sent at create time and a reminder 24h before.

**Recurrence behavior (Single template, auto-generate next)**
- Mentor sets cadence once. The current occurrence has its own row.
- A scheduled job (cron edge function, hourly) finds completed/past announcements whose template is recurring and auto-creates the next occurrence (same fields, new date).
- "Stop recurrence" button on the template ends future generation.

**Reminder timing**
- Initial announcement: immediate notification.
- Day-before reminder: cron sends in-app + email 24h before `meeting_at`.

---

### Feature 2 — Backup Mentor Pool + Handover

**Concept**
- Each primary mentor has a configurable pool of backup mentors (other users with the `mentor` role).
- When a primary becomes unavailable, an admin opens a "Handover" dialog: pick start date, end date, and one backup from the pool. All the primary's active students are temporarily routed to that backup.
- Backup gets full access (chat, performance, announcements, RSVP visibility) for the handover window.
- After end date (or admin "End handover now"), access reverts to the primary automatically.

**Admin UX**
- New page `/admin/mentor-handovers`: list active and past handovers, "New handover" button, end early action.
- Mentor profile in admin can edit the backup pool (add/remove mentors).

**Mentor UX**
- Mentor settings shows "My backup pool" (read-only list of who can cover for them — admin-managed).
- During an active handover the backup mentor sees the additional students under "My students" with a "Covering for {primary}" tag and end date.

**Student UX**
- Student dashboard mentor card shows "Your mentor this week: {backup name} (covering for {primary})" with end date.

---

### Technical Section

**New tables**

```text
mentor_announcements
  id, mentor_id, title, agenda, meeting_url, meeting_at,
  duration_minutes, status (scheduled|cancelled|completed),
  recurrence (one_off|weekly|fortnightly|monthly|custom_days),
  recurrence_interval_days int null,  -- for custom
  recurrence_active bool default true,
  parent_template_id uuid null,        -- links generated occurrences
  created_at, updated_at

mentor_announcement_rsvps
  id, announcement_id, student_id,
  response (attending|declined|no_response) default no_response,
  responded_at, created_at
  unique (announcement_id, student_id)

mentor_backup_pool
  id, primary_mentor_id, backup_mentor_id, added_by, created_at
  unique (primary_mentor_id, backup_mentor_id)

mentor_handovers
  id, primary_mentor_id, backup_mentor_id, started_at, ends_at,
  ended_early_at, reason, created_by, created_at
```

**Schema changes**
- No change to `mentor_student_assignments` (remains the source of truth for primary). Backup access is computed via `mentor_handovers` (active = `now()` between `started_at` and coalesce(`ended_early_at`, `ends_at`)).
- New SECURITY DEFINER helpers:
  - `is_active_backup_for_student(_mentor uuid, _student uuid) returns bool` — true if there's an active handover where backup_mentor_id = _mentor and primary owns _student.
  - `effective_mentor_for_student(_student uuid) returns uuid` — returns active backup if any, else primary.
- RLS on new tables:
  - `mentor_announcements`: mentor manages own; assigned students + active backup can SELECT; admins manage all.
  - `mentor_announcement_rsvps`: student manages own row; mentor of announcement (or active backup) reads all rows for their announcements.
  - `mentor_backup_pool`: admins manage; mentors read where they're primary or backup.
  - `mentor_handovers`: admins manage; involved mentors and impacted students read.
- Extend existing `mentor_messages` INSERT and `mentor_student_assignments` SELECT policies to also allow `is_active_backup_for_student`. Same extension for the chat read policy and group access.

**Notifications**
- DB trigger on `mentor_announcements` insert → `notifications` row per assigned student + enqueues `mentor-meeting-announced` transactional email via existing email queue.
- New cron edge function `send-meeting-reminders` (hourly) → finds announcements between `now()+23h` and `now()+24h`, sends reminder notification + email; marks `reminder_sent_at` (add column).
- New cron edge function `roll-mentor-recurrences` (hourly) → for each `recurrence_active` template whose latest occurrence is in the past, insert next occurrence with date = previous + interval.
- Both cron jobs registered via `pg_cron` + `pg_net` using the insert tool (per scheduling guidance).

**Edge functions**
- `send-meeting-reminders` (verify_jwt true, invoked by cron with service role)
- `roll-mentor-recurrences` (verify_jwt true)
- Reuse `process-email-queue` pipeline; add `mentor-meeting-announced` and `mentor-meeting-reminder` templates in `_shared/transactional-email-templates/` and register them.

**Frontend changes**
- `src/pages/MentorDashboard.tsx` — add "Announce meeting" CTA + upcoming announcements list with RSVP counters.
- New `src/pages/MentorAnnouncementsPage.tsx` — full CRUD list (route `/mentor/announcements`).
- New dialog component `src/components/MentorAnnouncementDialog.tsx` (create/edit form with recurrence selector).
- `src/pages/StudentDashboard.tsx` — add "Mentor meetings" card with next meeting + RSVP buttons.
- `src/pages/MentorStudentsPage.tsx` — when active handover exists for current mentor as backup, include those students with a "Covering" badge.
- New `src/pages/AdminMentorHandoversPage.tsx` (route `/admin/mentor-handovers`) + sidebar link.
- `src/pages/AdminMentorAssignmentsPage.tsx` — add "Backup pool" column with edit dialog.
- New hooks: `useMentorAnnouncements`, `useMentorAnnouncementRsvp`, `useMentorBackupPool`, `useMentorHandovers`.

**Out of scope / not changing**
- Calendar invites (.ics) — can be added later.
- Push/SMS — only in-app + email.
- Recurrence does not retro-create missed occurrences.

---

### Rollout order

1. Migration: tables, RLS, helper functions, triggers, extend chat/assignment RLS for backup access.
2. Edge functions + cron jobs + email templates.
3. Mentor announcement UI (dashboard CTA, dedicated page, dialog).
4. Student RSVP UI on dashboard.
5. Admin backup pool + handover UI.
6. Update Mentor Students/Chats pages to surface backup-covered students.
