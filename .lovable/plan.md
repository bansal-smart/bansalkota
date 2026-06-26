## Problem

In the admin Add/Edit Student modal, the "Course" dropdown actually writes the selected course ID into `profiles.batch_id` (a `course_batches` foreign key). No row is ever created in `enrollments`, so the student's "My Courses" page (which reads from `enrollments`) shows nothing. Only one value can be selected today.

## Goal

- Admin can assign **one or many courses** to a student (when adding or editing).
- Assigned courses appear immediately on the student's panel (`/my-courses`, course detail, lecture player, etc.).
- Assignment is a real `enrollments` row (`user_id`, `course_id`, `is_active=true`), which is what the rest of the app already reads.
- Batch (`course_batches`) stays as a separate optional field — not conflated with course.

## Changes

### 1. Admin Students UI (`src/pages/AdminStudentsPage.tsx`)
- Replace the single "Course" `<select>` (currently bound to `batch_id`) with a **multi-select courses control** (checkbox list / chip picker) bound to a new `course_ids: string[]` field.
- Add an optional "Batch" `<select>` (real `course_batches` list) so `batch_id` can still be set independently.
- For the Edit modal, pre-load the student's existing active enrollments and seed `course_ids` from them.
- Show a small "Courses" chip list in the student row/edit header so admins can see what's assigned.
- Send `course_ids` to the edge function on both Add and Edit.

### 2. Edge function: `supabase/functions/manage-student/index.ts` (update action)
- Accept `course_ids: string[]` in the payload (not in the profile `allowed` list).
- After profile update, **sync enrollments**:
  - Upsert `{ user_id, course_id, is_active: true, enrolled_at: now() }` for every id in `course_ids` (onConflict `user_id,course_id`).
  - Set `is_active=false` for any existing active enrollment whose course is not in `course_ids` (soft-remove; keeps progress intact).

### 3. Edge function: `supabase/functions/bulk-import/index.ts` (students kind)
- Accept `course_ids: string[]` (and also a comma-separated `course_slugs` / `course_names` fallback for CSVs).
- After creating/updating the profile, upsert the same enrollment rows for the resolved user.
- Leave the existing `enrollments` kind untouched.

### 4. Data display
- In the students table list, fetch active enrollments for the visible page and render assigned course names (truncated) in a new "Courses" column or inside the existing row, so admins can verify assignment.

## Out of scope

- No schema migrations — `enrollments` already has the needed columns and unique `(user_id, course_id)` index used elsewhere in the codebase.
- Student panel code is unchanged; it already reads `enrollments` and will light up automatically once rows exist.
- Payments / orders flow is untouched — admin assignment is a free grant, just like the existing `bulk-import "enrollments"` kind.
