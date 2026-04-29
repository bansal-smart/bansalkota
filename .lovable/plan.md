## Goal
In the teacher Live Classes page, associate every scheduled live class with one of the teacher's courses by adding a required Course dropdown to the Schedule modal.

The database already has `live_classes.course_id` — no schema change required.

## Changes

### `src/pages/TeacherLiveClassesPage.tsx`

1. Fetch the teacher's courses on mount:
   - Query `courses` filtered by `created_by = user.id`, selecting `id, name, subject`.
   - Store in a `courses` state array.

2. Add a new state: `courseId` (string).

3. In the Schedule modal, add a **required** "Course" dropdown as the first field (above Title):
   - Options come from the fetched teacher courses.
   - Placeholder option "Select a course".
   - When the user picks a course, auto-set `subject` from that course's subject (teacher can still override via the Subject dropdown).
   - If the teacher has zero courses, show an inline message: "Create a course first to schedule a live class for it." and disable the Schedule button.

4. Update `submit()`:
   - Validate `courseId` is selected (toast error otherwise).
   - Include `course_id: courseId` in the insert payload.

5. Reset `courseId` after successful submission alongside the other field resets.

6. In the class list cards, display the associated course name next to the subject for clarity:
   - Extend the local `LiveClass` type with `course_id` and join via `courses(name)` in the select, e.g. `select("..., course_id, courses(name)")`. Show `course.name` in the card meta line.

## Out of scope
- Admin live classes page (only teacher page was requested).
- Editing existing live classes to attach a course retroactively.
- Schema changes (column already exists, nullable — kept nullable so legacy rows don't break).
