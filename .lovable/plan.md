## 1. Remove pricing from Online Course form (Centre panel)
File: `src/pages/CenterOnlineCoursesPage.tsx`
- Drop the `price` / `original_price` inputs from the create/edit modal.
- Remove them from the `blank()` initial state and from the `handleSave` payload.
- Note: the columns stay in the DB (harmless), no migration needed.

## 2. Remove pricing from Offline Course form (Centre panel)
File: `src/pages/CenterCoursesPage.tsx`
- Drop the `currency` + `fees` inputs from the edit modal.
- Remove the "Fees on enquiry / `${currency} ${fees}`" line from each card.
- Remove the `fees` / `currency` rows from the bulk-CSV `fields` array so import/export no longer references pricing.

## 3. Add Live Classes management for centres (under the Courses area)
This needs both UI and a small DB tweak so live classes are scoped to a centre.

Backend:
- Add `centre_id uuid` (nullable, FK to `centres.id`) to `live_classes`, indexed.
- Add an RLS policy so a centre admin can `SELECT / INSERT / UPDATE / DELETE` rows where `centre_id` equals one of their staff-mapped centres (using the existing `centre_staff` table + `has_role('center_admin')`). Existing global policies remain untouched for super admin.

Frontend:
- New page `src/pages/CenterLiveClassesPage.tsx` — list/create/edit live classes for the centre (title, subject, educator, target exam, start time, end time, meeting URL, description, status). On create it sets `centre_id = primaryCenterId` and `created_by = user.id`.
- Add the route `/center/live-classes` in `src/App.tsx` (wrapped by `ProtectedCenterRoute` + `CenterLayout`, same pattern as the other centre pages).
- Add a "Live Classes" sidebar entry in `src/components/CenterLayout.tsx`.
- Add a "Live Classes" tile on `src/pages/CenterDashboardPage.tsx`.

Students of the centre will see these classes through the existing live-class views — no student-facing changes in this step.

## 4. Integrate Test Platform into the Centre admin panel
The Super Admin "Test Platform Hub" already exists (`AdminTestPlatformHub`, `AdminTestsPage`, `AdminTestResultPage`, etc.). For centres we will surface a read-only/operational subset:

- New page `src/pages/CenterTestsPage.tsx` — lists tests published by super admin (reuse the same `tests` query as `useTests`, filtered to `is_published = true`). For each test show: title, exam, total questions, duration, start/end, and two actions:
  - **Enroll Students** — opens a dialog listing the centre's mapped students (`profiles.centre_id = primaryCenterId`) with checkboxes; on submit, upsert rows into the existing test-enrollment mechanism (we'll piggyback on `enrollments` keyed by test id, or add a lightweight `test_enrollments` table if the codebase doesn't already have one — to be confirmed during implementation by reading `AdminTestsPage.tsx`).
  - **View Results** — links to a centre-scoped results page that reuses `AdminTestResultPage`'s data hooks but filters attempts to students whose `centre_id = primaryCenterId`.
- New page `src/pages/CenterTestResultsPage.tsx` — same table the super admin sees, but filtered to centre students. No "Send Result SMS" button (kept super-admin only).
- Add routes `/center/tests` and `/center/tests/:testId/results` in `src/App.tsx`.
- Add a "Test Platform" tile on the centre dashboard and sidebar.

No new pricing/payment surfaces are added on the centre side — enrolment is free and managed by the centre admin.

## Technical notes
- All centre pages stay under `ProtectedCenterRoute` so only `center_admin` / `super_admin` can access them.
- No changes to super-admin pages.
- Existing `centre_online_courses` rows keep their `price` columns; we just stop showing/writing those fields. We can drop the columns later if you confirm.
- For item 4, exact storage of "test enrolment per centre" depends on what `AdminTestsPage` already uses. If a suitable table doesn't exist we'll add `centre_test_enrollments(centre_id, test_id, student_id)` with the standard GRANT + RLS block.

Confirm and I'll implement all four in order.