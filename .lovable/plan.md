## Goal

1. Remove the Question Bank from the **Student** panel.
2. Add a real **Question Bank** to the **Teacher** panel — a persistent library of MCQs the teacher (and other teachers/staff) can build and reuse.
3. Update **Create Test** so it opens the Question Bank in the right half of the screen, where the teacher can **drag-and-drop** questions into the test on the left.
4. Audit **all pages, tables and dashboards** so they render correctly on **tablet (≥768px)** and **desktop (≥1024px)** widths. Mobile is out of scope per your message.

---

## 1. Database — new `question_bank` table

A new table to store reusable questions independent of any single test.

```text
question_bank
  id              uuid pk
  created_by      uuid (auth.uid)
  subject         text   (Physics / Chemistry / Mathematics / Biology)
  topic           text
  difficulty      text   (easy / medium / hard)
  question_text   text
  question_image_url text nullable
  options         jsonb  ([{id, text}, …])
  correct_answer  jsonb  (index or array of indices)
  explanation     text nullable
  marks_correct   numeric default 4
  marks_wrong     numeric default -1
  tags            text[] default '{}'
  is_public       boolean default true   -- visible to all teachers/staff
  created_at      timestamptz
  updated_at      timestamptz
```

RLS policies:
- **SELECT**: any authenticated teacher/staff/admin.
- **INSERT / UPDATE / DELETE**: row owner (`created_by = auth.uid()`) OR staff/admin.

Keep the existing `test_questions` table unchanged — drag-and-drop simply copies the question into `test_questions` on save (so a test stays self-contained even if the bank entry changes later).

A small seed (≈20 sample questions across Physics / Chem / Math / Bio) will be inserted so the bank isn't empty on first load.

---

## 2. Student panel — remove QBank

- Delete the `/qbank` route from `App.tsx`.
- Remove the **QBank** entries from `StudentLayout.tsx` (desktop sidebar `navItems` and mobile bottom nav). Replace mobile slot with **Doubts**.
- Remove the QBank quick-action card from `StudentDashboard.tsx` (line ~246).
- Delete `src/pages/QBankPage.tsx`.

The marketing copy mentioning "Question Bank" on `LandingPage` / course features stays — it's a feature description, not navigation.

---

## 3. Teacher panel — new Question Bank page

New route: `/teacher/question-bank` → `TeacherQuestionBankPage.tsx`. Sidebar entry added between **Create Test** and **Doubt Queue**, icon `BookMarked`.

Page layout (desktop ≥1024px):

```text
┌─ Filters bar ─────────────────────────────────────────────┐
│ [Subject ▾] [Topic ▾] [Difficulty ▾] [Search] [+ New Q]   │
├──────────────────────────────────────────────────────────┤
│ Question cards grid (2-col @md, 3-col @xl)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Q text…  │  │ Q text…  │  │ Q text…  │                 │
│  │ Phys·Med │  │ Chem·Hard│  │ Math·Easy│                 │
│  │ [edit][⋯]│  │ [edit][⋯]│  │ [edit][⋯]│                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└──────────────────────────────────────────────────────────┘
```

Features:
- Add / edit / delete a question (modal form: subject, topic, difficulty, text, 4 options, correct answer, explanation, tags).
- Filter by subject, topic, difficulty; full-text search across `question_text`.
- Pagination (20 per page) using existing `usePagination` hook.

A small `useQuestionBank` hook (mirroring `useCourses`) handles fetch + filters + realtime refresh.

---

## 4. Create Test — split layout with drag-and-drop

`CreateTestPage.tsx` is rewritten to a **two-pane layout** on screens ≥`lg`:

```text
┌────────────── Create Test ──────────────────────────────────┐
│ Left pane (50%, scrollable)        │ Right pane (50%)       │
│                                    │                        │
│ Basic setup (title, type, …)       │ Question Bank          │
│                                    │  Filters + search      │
│ Questions in this test             │  Draggable Q cards     │
│  ┌─ drop zone ──────────────────┐  │   ┌──────────┐         │
│  │ 1. Q text…  (from bank)  ✕   │  │   │ Q text…  │ drag→   │
│  │ 2. Q text…  (manual)     ✕   │  │   └──────────┘         │
│  │ + Add manual question        │  │   ┌──────────┐         │
│  └──────────────────────────────┘  │   │ Q text…  │         │
│                                    │   └──────────┘         │
│ [ Save Draft ]   [ Publish Test ]  │                        │
└────────────────────────────────────┴────────────────────────┘
```

- DnD via `@dnd-kit/core` (already a common shadcn-friendly choice; will be added).
- Drop a bank question into the test → it's pushed into the local `questions` array (snapshot copy of all fields, so future bank edits don't mutate the test).
- Existing manual "Add Question" form still available inside the left pane for ad-hoc questions.
- Reorder questions inside the test via drag handle (`@dnd-kit/sortable`).
- Below `lg` (tablet portrait / smaller), the right pane collapses into a **"Open Question Bank"** drawer (`Sheet` component) so the form stays usable.

Submit logic in `submit()` is unchanged — it still inserts rows into `tests` + `test_questions`.

---

## 5. Responsiveness audit (tablet + desktop)

Target breakpoints: **md = 768px (tablet)** and **lg = 1024px (desktop)**. Mobile (<768) is left as-is per your scope.

Pass over each page/table/dashboard and apply consistent fixes:

- **Tables** (`AdminUsersPage`, `AdminPaymentsPage`, `AdminCoursesPage`, `AdminTestsPage`, `AdminLiveClassesPage`, `AdminEnquiriesPage`, `AdminEducatorApplicationsPage`, `AdminReportsPage`, `TeacherStudentsPage`, `TeacherCoursesPage`, `TeacherLiveClassesPage`):
  - Wrap in `overflow-x-auto` with a min-width so columns don't crush.
  - Hide non-essential columns on `md` (`hidden lg:table-cell`); keep core columns visible.
  - Convert action button rows from wrapping into a single-row `flex-nowrap` with truncated labels (icon-only on `md`).

- **Dashboards** (`StudentDashboard`, `TeacherDashboard`, `AdminDashboard`, `StaffDashboardPage`, `TeacherAnalyticsPage`, `AnalyticsPage`):
  - Stat cards: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
  - Charts: wrap in `ResponsiveContainer` (already the case for most); ensure parent has fixed `h-[260px] md:h-[320px]`.
  - Side panels (e.g. "Pending approvals", "Upcoming classes") move from full-width on tablet to a 2-column grid on `xl`.

- **Forms** (`CreateTestPage`, `CreateCoursePage`, `TeacherSettingsPage`, `AdminSettingsPage`, `LoginPage`, `SignupPage`):
  - Field grids: `grid-cols-1 md:grid-cols-2`.
  - Containers: replace fixed `max-w-3xl mx-auto` with `max-w-3xl xl:max-w-5xl mx-auto` so wide screens use the space.

- **Layouts** (`TeacherLayout`, `StudentLayout`, `AdminLayout`):
  - Sidebar already `hidden lg:flex` (good); ensure header search collapses to icon-only at `md`.
  - Main content `px-4 md:px-6 xl:px-10` for consistent gutters.

- **Course / lesson grids** (`CoursesPage`, `MyCoursesPage`, `EducatorsPage`, `LiveClassesListPage`, `TestListPage`):
  - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.

A short checklist comment at the top of each touched file documents the breakpoints used, so future edits stay consistent.

---

## Tech notes

- New dep: `@dnd-kit/core` + `@dnd-kit/sortable` (~12 kB gz). No other infra changes.
- `supabase/migrations/<ts>_add_question_bank.sql` adds the table, RLS, and seed rows.
- `src/integrations/supabase/types.ts` is regenerated automatically.
- New files:
  - `src/pages/TeacherQuestionBankPage.tsx`
  - `src/components/QuestionBankPanel.tsx` (shared between the standalone page and the Create Test right-pane)
  - `src/components/QuestionEditorDialog.tsx`
  - `src/hooks/useQuestionBank.ts`
- Edited files: `App.tsx`, `TeacherLayout.tsx`, `StudentLayout.tsx`, `StudentDashboard.tsx`, `CreateTestPage.tsx`, plus the responsiveness pass listed above.
- Deleted: `src/pages/QBankPage.tsx`.
