# Fix course card actions on /courses

## Problem
The /courses page (linked from "Browse Courses" in the student dashboard) only shows a single "View Batch" button that navigates to the course detail page. There is no way to enroll directly from the listing, unlike the Store tab which has an "Enroll Now" CTA.

## Goal
Each course card on `/courses` should expose two clear actions:
1. **View Details** → navigates to `/courses/:slug` (existing course detail page)
2. **Enroll Now** → opens the existing `EnrollmentModal` (the same 3‑step payment-aware modal already used elsewhere in the app)

## Changes

### `src/pages/CoursesPage.tsx`
- Convert the outer `<Link>` wrapper of each course card into a plain `<div>` so the inner buttons can have independent click behavior (no nested-anchor / accidental navigation).
- Add local state `enrollFor: CourseRow | null` to track which course's enrollment modal is open.
- Replace the single "View Batch" button at the bottom of each card with a two-button row:
  - **View Details** — outlined style, uses `useNavigate()` to push `/courses/${c.slug}`.
  - **Enroll Now** — solid primary gradient style, sets `enrollFor` to open the modal. If the user is not logged in, redirect to `/login` first (consistent with other enroll CTAs in the app).
- Keep the existing card hover/lift styling; make the whole image area still clickable to navigate to details for convenience.
- Render `<EnrollmentModal>` once at the bottom of the page, controlled by `enrollFor`, passing `courseId`, `courseName`, and `coursePrice`.

### No changes to
- `EnrollmentModal.tsx` — already supports the full plan/success/error flow and staff demo enroll.
- `StorePage.tsx` — left as-is (it already has Enroll Now).
- `useCourses` / routing / DB schema — no changes required.

## Technical notes
- Import `useNavigate` from `react-router-dom` and `EnrollmentModal` from `@/components/EnrollmentModal`.
- Buttons use `e.preventDefault(); e.stopPropagation();` only if kept inside a Link; simpler to drop the Link wrapper entirely.
- Auth check: read `user` from `useAppStore` (already imported) — if absent on Enroll click, `navigate("/login")`.
- Price is shown in ₹ (existing convention on this page); modal already formats with `toLocaleString()`.

## Out of scope
- Wiring real Razorpay/Stripe payments (modal already shows the "coming soon" message).
- Changes to the Store tab.
