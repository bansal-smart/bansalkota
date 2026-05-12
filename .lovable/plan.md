## School Entity + Bulk Student Onboarding

### 1. Database

**New table `schools`** (admin-managed):
- name, code (unique), city, country, board (CBSE / ICSE / IB / CBSE-i / Other), contact_person, contact_email, contact_phone, address, is_active
- standard timestamps + created_by

**Extend `profiles`**:
- `is_associated_to_school boolean default false`
- `school_id uuid` nullable, references schools(id)
- Trigger keeps `is_associated_to_school` in sync with whether `school_id` is set.

**RLS**:
- `schools`: admin/super_admin full manage; authenticated SELECT (so student profile can show their school name).
- Profile changes follow existing rules; only admin edge function will set `school_id` for students.

### 2. Bulk CSV onboarding (admin)

New page `/admin/schools`:
- List of schools (search, active toggle, student count).
- "Add school" dialog (standard fields).
- School detail drawer: shows enrolled students + "Bulk upload students" action.

**CSV format**: `full_name, email, phone, class_level, target_exam, city` (email required, rest optional).

**Edge function `bulk-onboard-school-students`** (admin-only):
- Input: `school_id`, array of rows.
- For each row: create auth user with random temp password (email-confirm auto), insert profile with `school_id`, assign `student` role, queue welcome email with login + temp password.
- Returns per-row `{ status: created | skipped_existing_linked | error }` summary shown in UI.
- If email already exists as a student → just link `school_id` to existing profile (no new account).

### 3. Student visibility

- `ProfilePage`: show "School: {name}" badge when `school_id` set (read-only).
- No other UX changes for students; they remain regular students.

### 4. Admin students page

- Add "School" column + filter by school in `/admin/students`.

### Out of scope
- School-coordinator dashboard / login.
- Bulk plans, shared courses, school billing.
- Manual one-by-one student add (CSV only per request; existing admin "add student" still works for non-school students).

### Rollout
1. Migration: `schools` table + profile columns + trigger + RLS.
2. Edge function `bulk-onboard-school-students`.
3. Admin Schools page + CSV upload UI + results modal.
4. Add school column/filter to admin students page.
5. Show school on student `ProfilePage`.
