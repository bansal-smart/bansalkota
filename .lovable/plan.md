## 1. Students tab leaking centre_admin users

**Root cause:** the `handle_new_user` trigger assigns the `student` role to every new auth user, including users created by `admin-create-center-user` / `seed-staff-user`. So centre admins carry both `student` + `center_admin` rows in `user_roles`, and `AdminStudentsPage` only filters on `role = 'student'`.

**Fix (frontend only, no schema change):** in `AdminStudentsPage.tsx` (`load()` around L219 and the CSV export around L375), after fetching the `student` role IDs, fetch all rows from `user_roles` where role IN ('center_admin','admin','super_admin','teacher','mentor') and **exclude** those user_ids from `studentIds` before querying profiles. Realtime subscription already re-runs `load()` on `user_roles` changes, so suspensions/role swaps stay live.

## 2. Bulk import: add `batch_code` so students get auto-mapped to batches

- `bulk-import` already resolves a `batch` column by name **or** code (see `batchByKey`). Make this explicit and user-friendly:
  - In `AdminStudentsPage.tsx` `BulkCsvDialog.fields`, replace the single `batch` field with `batch_code` (label "Batch Code", example "XI-J1"). Keep backward-compat in the edge function by accepting both `batch_code` and `batch`.
  - In `supabase/functions/bulk-import/index.ts` (students branch ~L232), read `r.batch_code ?? r.batch`; if not found, return a clear per-row error (`Batch code not found: <code>`) so admins know to create it first.
- Update `Add Student` modal copy to call the field "Batch Code" too (it already uses a batch dropdown, no behaviour change).

## 3. Clean up `AdminBatchesPage` and add edit

- **Remove** the "Run Kota CBT bulk setup" button and the entire "Import students from Excel" card (and unused state: `parsedRows`, `importErrors`, `handleFile`, `submitImport`, the `XLSX`/`roster` imports). Add a small info banner pointing admins to **Students → Bulk Import** with the `batch_code` column.
- **Course ↔ Batch model:** already enforced — `course_batches.course_id` is required (FK to `courses`), and there is no unique constraint forcing one batch per course, so one course → many batches works today. Surface it in the UI by grouping the batch list by course name.
- **Edit batch:** add a pencil icon per row that opens a small inline modal/dialog with fields: Course (select), Code, Display name, Class level, Active toggle. On save: `update course_batches set ... where id = ?`. Re-use the existing `createBatch` validation. Keep the existing Delete action.
- Keep the CBT Kiosk + Secret Admin URL panels and the "Add a new batch" form.

## Files touched

- `src/pages/AdminStudentsPage.tsx` — staff-role exclusion in `load()` and CSV export; rename bulk field to `batch_code`.
- `supabase/functions/bulk-import/index.ts` — accept `batch_code`, fail clearly when unknown.
- `src/pages/AdminBatchesPage.tsx` — strip CBT/Excel sections, group by course, add Edit dialog.

No database migration required.