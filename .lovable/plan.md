# Course Detail: Enrollment State, PDF Downloads, Progress Tracker

Three tightly-related improvements to `CourseDetailPage.tsx`, plus a small schema addition for PDF notes.

---

## 1. Enrolled state after confirming the dialog

The "Payments coming soon" dialog currently just closes. We'll add a **"I've paid — mark me enrolled"** confirmation flow so the demo experience is complete:

- The dialog gets a primary action `Mark as Enrolled (Demo)` next to "Contact Support".
- On click: `INSERT` into `enrollments` (`user_id`, `course_id`, `is_active=true`) — RLS already allows users to insert their own.
- Local `enrolled` state flips to `true`, dialog closes, success toast.
- Sticky purchase card button changes to a disabled `✓ Enrolled` pill plus a separate `Continue Learning →` button that navigates to `/courses/:slug/learn`.
- Existing enrollment check on page load already handles returning users.

This keeps everything client-side / RLS-safe with no edge function needed.

---

## 2. PDF Notes tab — real downloads

### Schema change (one migration)
Add a new table:

```sql
create table public.course_pdfs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  title text not null,
  file_url text not null,
  size_bytes bigint,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.course_pdfs enable row level security;

-- Anyone can view PDFs of published courses
create policy "View pdfs of published courses" on public.course_pdfs
for select using (exists (
  select 1 from public.courses c
  where c.id = course_pdfs.course_id and c.is_published = true
));

-- Staff/teachers manage
create policy "Staff manage pdfs" on public.course_pdfs
for all to authenticated
using (has_role(auth.uid(),'staff') or has_role(auth.uid(),'admin'))
with check (has_role(auth.uid(),'staff') or has_role(auth.uid(),'admin'));

create policy "Teachers manage pdfs of own courses" on public.course_pdfs
for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_pdfs.course_id and c.created_by = auth.uid()))
with check (exists (select 1 from public.courses c where c.id = course_pdfs.course_id and c.created_by = auth.uid()));
```

### `useCourseDetail` hook
Also fetch `course_pdfs` for the course and return `pdfs: CoursePdfRow[]`.

### CourseDetailPage — `PDF Notes` tab
- If `pdfs.length === 0`: keep the empty state.
- Otherwise: render a list of cards, each with:
  - File icon, title, size (formatted from `size_bytes`).
  - **Download** button (Lucide `Download` icon) — anchor `<a href={file_url} download target="_blank" rel="noopener">`.
- Free preview rule: PDFs are gated — show download only if `enrolled`, otherwise show a `Lock` icon and "Enroll to download" text.

No upload UI in this change (admin upload can come later); URLs can be seeded by staff via existing `educator-uploads` bucket.

---

## 3. Progress tracker on the detail page

### Data
The `enrollments` table already stores `progress_percent`, `completed_lessons`, and `last_lesson_title`. The lecture player already updates these on completion. We just need to read and display them.

### Hook
In `CourseDetailPage`'s existing enrollment query, also select `progress_percent, completed_lessons, last_lesson_title, last_accessed_at`. Store as `enrollment` object instead of just a boolean.

### UI additions

**Stats grid (About tab)** — when enrolled, replace the static "Rating" card with a **Progress** card showing `{progress_percent}%` and a small horizontal bar.

**Lectures tab header (new)** — when enrolled, render a progress strip above the chapter list:
```
████████░░░░  45%   ·   12 of 26 lessons completed
Last watched: Newton's Third Law
[Continue Learning →]
```

**Time tab** — replace its current placeholder with a real summary when enrolled:
- Total content: `{totalHours} hrs`
- Completed: `{completedHours} hrs` (computed from completed lessons' `duration_seconds`)
- Remaining: `{remainingHours} hrs`
- Progress bar
- Last accessed timestamp (relative, e.g. "2 hours ago")

**Sidebar card** — when enrolled, the Enroll button area shows the progress bar + `Continue Learning →` instead of price.

Per-lesson check marks in the Lectures accordion: use the same `lesson_progress` query the player uses (filtered to `is_completed = true`) so completed lessons show a green `CheckCircle2` instead of `Play`.

---

## Files touched

- **migration**: create `course_pdfs` table + RLS
- `src/hooks/useCourseDetail.ts` — fetch `pdfs`, fetch `lesson_progress` for enrolled user, return them
- `src/pages/CourseDetailPage.tsx` — enrolled state UX, PDF list, progress UI in About / Lectures / Time tabs and sidebar
- No changes to `LecturePlayerPage.tsx` (already writes the data we now read)

## Out of scope

- Real payment gateway
- Admin UI to upload course PDFs (URLs can be inserted manually for now)
- Server-recomputed progress (we trust the player's writes)
