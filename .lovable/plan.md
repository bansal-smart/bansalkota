## Add Parent Phone Number for Students + Send Result SMS to Parent

### 1. Database
Migration on `profiles`:
- Add `parent_phone TEXT` and `parent_phone_e164 TEXT` columns (nullable, so existing non-student profiles aren't blocked).

### 2. Profile Completion (student onboarding)
Update `src/components/ProfileCompletionDialog.tsx`:
- Add a required **Parent's Phone** field next to the student's Phone.
- Validate with zod (min 7, max 20, digits only).
- Save into `parent_phone` (and store an E.164-normalised copy in `parent_phone_e164`).

### 3. Profile Page
Update `src/pages/ProfilePage.tsx` so students can view/edit Parent Phone after onboarding (read-only display + edit if profile editing is supported there).

### 4. Result SMS — send to parent too
Update `supabase/functions/prpsms-send-result-sms/index.ts`:
- Fetch `parent_phone_e164, parent_phone` alongside the student phone.
- For each roster row, after sending to the student, if a parent phone exists, send the same rendered "Result" SMS to the parent number.
- Log each parent send in `sms_send_log` with `purpose: "result_release_parent"` so admin reports separate the two.
- Include parent sends in the `sent` / `failed` totals and return `parent_sent` count in the JSON response.

### 5. Admin visibility (small)
Update `src/pages/AdminStudentsPage.tsx` to display the Parent Phone column (read-only) so admins can verify students filled it in. No edit UI changes beyond surfacing the field.

### Notes
- No changes to BOOST registration flow (it already has its own parent fields).
- No pricing changes. No new RLS policies required — `profiles` policies already cover the new columns.
- Existing students who completed onboarding before this change will see the parent phone prompt next time they open the dialog only if we re-flag them; we will NOT force re-onboarding — instead the Profile page will show a banner asking them to add it. (Confirm if you'd prefer to force re-onboarding instead.)
