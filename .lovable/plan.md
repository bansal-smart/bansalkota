## Goal
Import all 122 alumni records from `bansal_alumni_registrations.xlsx` into the `alumni_submissions` table and display every detail in the admin **Alumni Submissions** tab.

## Issue
The XLSX has several fields the current `alumni_submissions` table doesn't store (father's name, course/program, college joined, stream taken, selection year, full address, verified flag, original registration date/id). To preserve "all available details" we need to extend the schema first.

## Steps

### 1. Schema migration — add new columns to `alumni_submissions`
Add nullable columns (no breaking change to existing flow):
- `father_name text`
- `course_program text`
- `selection_year text` (XLSX contains values like `2014` and `"unselected"`)
- `college_joined text`
- `stream_taken text`
- `address text`
- `verified boolean default false`
- `source_registration_id integer` (the legacy ID 1..135 — used as dedup key)
- `registered_at timestamptz` (original registration date)

Add unique index on `source_registration_id` (where not null) to make re-imports idempotent.

### 2. Bulk insert 122 rows
Parse the XLSX and insert with this mapping:

| XLSX column | DB column |
|---|---|
| ID | source_registration_id |
| Full Name | full_name |
| Father's Name | father_name |
| Email | email |
| Phone Number | phone (cast to text) |
| Course/Program | course_program |
| Bansal Study Year (`2009-10`) | batch_year = 2009 (first 4 digits) |
| Competitive Exam | exam |
| Selection Year | selection_year |
| Exam Rank | rank_label |
| College Joined | college_joined, also → `company` for back-compat display |
| Stream Taken | stream_taken, also → `current_position` for back-compat display |
| Address | address |
| LinkedIn Profile | linkedin_url |
| Verified (`Yes`/`No`) | verified bool; `status` = `approved` if Yes else `pending` |
| Registration Date | registered_at |

`story` is NOT NULL — fill with a synthesized line (e.g. `"Bansal alumnus, batch <year>, selected in <exam> <year>, joined <college>."`) so existing UI keeps rendering.

Dedup: `ON CONFLICT (source_registration_id) DO NOTHING`.

### 3. Update Admin "Alumni Submissions" tab
`src/pages/AdminAlumniSubmissionsPage.tsx` — extend the row detail / card to surface the new fields:
- Father's Name, Course/Program, College Joined, Stream Taken, Selection Year, Address, Verified badge, Registered At, Source ID.
- Keep existing approve/reject/status workflow untouched.

### 4. Verification
- Query `SELECT count(*) FROM alumni_submissions WHERE source_registration_id IS NOT NULL` → expect 122.
- Open `/admin/alumni-submissions` and confirm rows render with all new fields.

## Out of scope
- No changes to the public `/alumni` page rendering logic.
- No changes to the alumni submission form schema (the new columns stay nullable).
