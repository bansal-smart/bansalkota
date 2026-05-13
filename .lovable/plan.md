## Student Report — Monthly PDF (Admin)

Add a new admin section that lets the admin pick any student + any month, preview key academic statistics, and download a branded PDF report intended for parents.

### Navigation
- Add a new sidebar item **"Student Report"** in `src/components/AdminLayout.tsx` (icon: `FileBarChart` from lucide-react), route `/admin/student-reports`.
- Register the route in `src/App.tsx` under the existing admin protected routes, rendering a new page `AdminStudentReportsPage`.

### Page layout (`src/pages/AdminStudentReportsPage.tsx`)
Two sections, matching the user's "Both" preference:

1. **Quick generator (top card)**
   - Student search/select combobox (search profiles by name/email, students only).
   - Month picker (shadcn calendar in single-month mode, default = last completed month).
   - "Preview" button → loads stats into the on-page preview below.
   - "Download PDF" button → generates and downloads the PDF.

2. **Students table (below)**
   - List of students with name, target exam, class level, mentor.
   - Shared month selector at the top of the table.
   - Per-row "Download report" button (uses the selected month).
   - Pagination + simple search (reuse existing pagination/search patterns from `AdminStudentsPage`).

### Report contents (single page where possible, else 2)
Branded header (Arke logo, orange/navy theme, parent-friendly tone), then:

1. **Student summary** — name, class, target exam, mentor name, report period.
2. **Test performance** — tests attempted in month, average score %, average accuracy, best percentile, subject-wise mini bar chart, plus a small line chart of score trend across the month.
3. **Attendance** — live classes registered vs attended in the month + a single donut/percent.
4. **Course progress** — list of enrolled courses with progress bars (current % overall, with delta this month if available).
5. **Engagement** — doubts asked, doubts answered, study streak (days active in month), best streak.
6. **Parent note footer** — short auto-generated plain-English summary (e.g. "Aarav attended 8 of 10 live classes and improved physics accuracy by 12%.") and the Arke contact line.

Only these stats are included; nothing else, per "keep only the important statistics".

### Data sources (already in DB)
- `profiles` + `user_roles` (filter `role = 'student'`).
- `test_attempts` (status in submitted/auto_submitted, `submitted_at` in month) joined to `tests` for subject info, plus `subjects` jsonb the report function already returns.
- `live_class_attendance` joined to `live_classes` with `starts_at` in month.
- `enrollments` + `courses` for course progress.
- `doubts` for asked/resolved counts.
- `study_sessions` for active days / streak in month.

### PDF generation (client-side, downloadable)
- Use `jspdf` + `jspdf-autotable` for the document, and `chart.js` (already implied via shadcn/recharts is also fine) to render charts to canvas, then embed as images via `pdf.addImage`.
  - Preferred concrete stack: render the charts off-screen with **Recharts** (already in the project) inside a hidden container, snapshot with **html2canvas**, and embed in jsPDF. This avoids adding heavy new chart libs.
- New dependencies: `jspdf`, `jspdf-autotable`, `html2canvas`.
- Filename: `Arke_Report_<StudentName>_<YYYY-MM>.pdf`, triggered via `pdf.save(...)` so it downloads immediately.
- Logo embedded from `/public` (existing Arke logo asset) as base64.

### Hook for stats
Create `src/hooks/useStudentMonthlyReport.ts` that takes `{ studentId, month }` and returns the aggregated stats object the report renderer consumes. All queries scoped server-side by month range; existing admin RLS already allows reads on the relevant tables.

### Acceptance
- New "Student Report" item visible in the admin sidebar.
- Admin can search a student, pick any month, and click Download → branded multi-section PDF with charts downloads.
- Table view also offers per-row downloads using the shared month selector.
- No backend schema changes required.

### Out of scope
- Emailing the report to parents (download only for now).
- Mentor feedback section, comparative class rankings, custom date ranges.
