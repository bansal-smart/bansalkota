## Goal
On the Course Detail page:
1. Add a BOOST CTA inside the "Know More Details" section with an "Explore" button → `/boost`.
2. Rename the right-column "Pay Now" button to "Enroll Now".
3. Clicking "Enroll Now" first opens a Course Enquiry form. Only after submitting the enquiry does the Cashfree payment window open.
4. Save every enquiry (even if payment never completes) and surface them in the admin panel under a new "Course Enquiries" tab.

## Implementation

### 1. Database — new table `course_enquiries`
Fields: `id`, `course_id` (fk → courses), `course_name` (snapshot), `course_price` (snapshot), `user_id` (nullable), `full_name`, `email`, `phone`, `class_level`, `city`, `state`, `preferred_centre_id` (nullable), `message`, `payment_status` (`pending` | `initiated` | `paid` | `failed`, default `pending`), `payment_order_id`, `payment_id`, `paid_at`, `enrolled`, `status` (`new` | `contacted` | `converted` | `closed`), `admin_notes`, `created_at`, `updated_at`.

RLS:
- `INSERT` allowed for everyone (anon + authenticated) — needed so enquiry is saved even if user not logged in / before payment.
- `SELECT/UPDATE/DELETE` only for `admin` / `super_admin` via `has_role`.
- Grants: `INSERT` to anon + authenticated; full to service_role.

### 2. Frontend — `src/pages/CourseDetailPage.tsx`
- In the "Know More Details" section, add a BOOST callout card: short pitch + `Explore` button linking to `/boost`.
- Change CTA label from `Pay Now ₹X` → `Enroll Now`.
- Replace the existing confirm-enroll dialog with a new **CourseEnquiryDialog**:
  - Fields: Full name, Email, Phone, Class level (dropdown 9/10/11/12/Dropper), City, State, Preferred centre (optional dropdown of centres), Message (optional).
  - Pre-fill from `profiles` if logged in.
  - On submit: insert into `course_enquiries` with `payment_status='pending'`, then call existing Cashfree create-order edge function (`cashfree-create-order`) with `enquiry_id` in metadata; on success open Cashfree checkout via `@/lib/cashfree`. If the user closes the modal mid-payment, the enquiry row is already saved.
  - Update edge functions `cashfree-create-order` + `cashfree-webhook` (or verify) to update the matching `course_enquiries` row (`payment_status`, `payment_id`, `paid_at`) when payment succeeds. Existing enrollment-creation logic remains.

### 3. Admin panel — new "Course Enquiries" tab
- New page `src/pages/AdminCourseEnquiriesPage.tsx` mirroring the style of `AdminEnquiriesPage`/`AdminLandingLeadsPage`:
  - Table columns: Created, Name, Phone, Email, Course, Class, City, Payment status badge (pending/paid/failed), Status, Actions.
  - Filters: payment status, course, date range, search.
  - Row click opens a side drawer with full details + editable `status` + `admin_notes` + "Mark as paid" manual override.
  - CSV export.
- Add route `/admin/course-enquiries` in `src/App.tsx`.
- Add sidebar entry "Course Enquiries" in `src/components/AdminLayout.tsx` (near existing Enquiries / Landing Leads).

### 4. Hook
- `src/hooks/useCourseEnquiries.ts` for list + mutate (admin-only fetch).

## Files touched
- New migration creating `course_enquiries` table + RLS + grants.
- `src/pages/CourseDetailPage.tsx` — BOOST CTA, button rename, enquiry-first flow.
- New `src/components/CourseEnquiryDialog.tsx`.
- `src/pages/AdminCourseEnquiriesPage.tsx` (new).
- `src/hooks/useCourseEnquiries.ts` (new).
- `src/App.tsx` — admin route.
- `src/components/AdminLayout.tsx` — sidebar link.
- `supabase/functions/cashfree-create-order/index.ts` + `cashfree-webhook/index.ts` — accept/update `enquiry_id` and write payment status back to `course_enquiries`.

## Open questions
- Should the enquiry form require login, or accept anonymous submissions too? (Defaulting to: works for both — pre-fill if logged in, otherwise capture contact details freely.)
- Any specific fields you want beyond the list above (e.g., parent name, board)?