## Plan

1. **Fix the roster source**
   - Update the backend `admin_test_not_attempted` function so it reliably returns each assigned batch student's real `full_name`, `roll_number`, and batch details for the selected test.
   - Keep the existing auth checks for admin, super admin, teacher, and centre admin.

2. **Make the UI stop falling back incorrectly**
   - Update `AdminTestAttemptsPage.tsx` so absent rows use the returned `full_name` directly first, then the profile map, and only show `Student` if no name exists at all.
   - Include roll number/batch as supporting data if useful for distinguishing students.

3. **Verify with the existing `fasd` test**
   - Confirm the test has students in `XII-A1` and `XII-A2`.
   - Verify the attempts page shows the actual names like the Students table, not repeated `Student` labels.

## Technical notes

- The database currently shows `fasd` has `XII-A1` and `XII-A2` students with names present, so the issue is in the absent-roster name handoff/rendering, not missing student data.
- I will avoid changing unrelated test/result logic.