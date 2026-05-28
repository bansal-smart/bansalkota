## Admin panel audit

Here's what already exists in the admin sidebar and what's still missing.

### ✅ Already fully managed

| Area | Admin page | Notes |
|---|---|---|
| Courses (list, create, edit, publish) | `AdminCoursesPage`, `CreateCoursePage` | |
| Chapters / Lessons / Subjects per course | `AdminCourseContentPage` | Drag-drop chapter & lesson editor (dnd-kit) |
| Course PDFs / resources | `AdminCourseContentPage` + `course_resources` | |
| Tests (catalogue, create, edit) | `AdminTestsPage`, `CreateTestPage` | |
| Test Series | `AdminTestSeriesPage` | |
| Question Bank | `AdminQuestionBankPage` | |
| Compete questions (1v1) | `AdminCompeteQuestionsPage` | |
| Live classes | `AdminLiveClassesPage` | |
| Books + Module Packs (E-Store catalogue) | `AdminBooksPage` (tabs: books / packs) | |
| Centres (pan-India locations) | `AdminCentersPage` *(just added)* | |
| Toppers / Achievements | `AdminToppersPage` *(just added)* | |
| Public page hero banners | `AdminBannersPage` *(just added)* | 17 pages |
| Enquiries (contact form) | `AdminEnquiriesPage` | |
| Educator applications | `AdminEducatorApplicationsPage` | |
| Users / Students / Schools | `AdminUsersPage`, `AdminStudentsPage`, `AdminSchoolsPage` | |
| Mentor assignments & handovers | `AdminMentorAssignmentsPage`, `AdminMentorHandoversPage` | |
| Exam catalogue (JEE/NEET/etc.) | `AdminExamsPage` | |
| Notifications | `AdminNotificationsPage` | |
| Payments & revenue (super-admin) | `AdminPaymentsPage` | |
| Reports / moderation | `AdminReportsPage`, `AdminModerationPage` | |
| Platform settings (super-admin) | `AdminSettingsPage` | |
| Admin management (super-admin) | `AdminAdminsPage` | |

### ❌ Genuine gaps to close

1. **BOOST 2026 scholarship exam** — public `/boost` page exists with a "₹99 to register" CTA, but there is **no registration form, no DB table, and no admin view**.
2. **E-Store orders** — `orders` + `order_items` tables exist (customers can checkout) but there is **no admin page** to view/manage incoming orders.

Everything else the user listed (courses, content, chapters, tests, test series, e-store products, centres, enquiries) is already covered.

---

## Plan

### 1. BOOST exam — full registration flow

**Database (new migration)**
- `boost_registrations` table: `full_name`, `email`, `phone`, `whatsapp`, `date_of_birth`, `class_level` (5–12, dropper), `target_exam` (JEE/NEET/NTSE/Olympiad/School), `school_name`, `city`, `state`, `parent_name`, `parent_phone`, `preferred_centre_id` (FK → `centers`), `exam_slot` (date+time choice), `payment_status` ('pending'|'paid'|'failed'), `payment_ref`, `amount` (default ₹99), `admit_card_number` (auto-generated), `status` ('registered'|'confirmed'|'attended'|'cancelled'), `notes`.
- GRANTs + RLS: anyone can `INSERT` (public registration); admin/super_admin can `SELECT/UPDATE/DELETE`; students can `SELECT` their own rows by email.
- Trigger to auto-generate admit card number on insert.
- Notify admins via existing `notify_admins()` helper on new registration.

**Public side**
- Add a "Register now" CTA section to `BoostPage.tsx` opening a multi-step modal/form (personal → academic → centre & slot → payment placeholder).
- Use `zod` for validation (per project security guideline).
- On submit → insert row + show admit card number + success screen.

**Admin side**
- New `AdminBoostPage.tsx` at `/admin/boost`:
  - Filterable table (status, exam slot, centre, payment status)
  - Bulk export to CSV
  - Mark paid / confirmed / attended
  - Stats header (total registered, paid, by centre)
- Sidebar entry "BOOST Registrations" under base nav.

### 2. E-Store orders admin

- New `AdminOrdersPage.tsx` at `/admin/orders`:
  - Table: order ID, customer name + email, items count, total, payment status, shipping status, created date
  - Detail drawer: line items, shipping address, mark as shipped/delivered/refunded
  - Filter by status & date range
- Sidebar entry "E-Store Orders" near "Books / E-Store".

### 3. Wiring
- Register new routes in `App.tsx` (`/admin/boost`, `/admin/orders`).
- Add sidebar items in `AdminLayout.tsx`.
- Both pages gated by existing `ProtectedAdminRoute` (admin + super_admin).

### Out of scope (already covered or explicitly not requested)
- Subjects: currently free-text fields on courses/chapters/lessons — no dedicated subject master table needed unless you want to constrain values.
- Faculty directory: the public `/educators` page already reads from `profiles` + `user_roles` (teacher role), managed via Users & Educator Applications.

---

**Approve this plan and I'll implement it.** Reply with anything to tweak (e.g. skip the BOOST payment placeholder, change which fields go on the registration form, add subject master, etc.).
