
# Gap Analysis — Requirements vs Current Build

Below is a status check of every item on your notes, followed by the work needed to close the remaining gaps.

## A. Centre Admin Panel

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Bulk Import/Export — Centres, Students, Courses, Centre Support | Partial | `AdminCentersPage`, `AdminCenterSupportPage`, `AdminStudentsPage`, `AdminCoursesPage` exist, but no Bulk Import / CSV Export UI on any of them (only DocxBulkImportDialog for questions). |
| 2 | Centre login & password in 'Centres Tab' | Missing | `center_staff` table exists but Admin → Centres has no "Create login / reset password" action. |
| 3 | Alphabetical order on website, Kota pinned on top | Missing | `CentersPage` orders by DB `sort_order` only — no alphabetical sort, no Kota pin logic. |
| 4 | 'Centre' spelling consistent everywhere | Partial | Mixed: PublicLayout uses "Centers" / "Find a Center"; CentersPage uses "Centres". Needs normalization to "Centre". |
| 5 | Centres manage their students' data & status + courses | Done | Centre portal (`CenterStudentsPage`, `CenterCoursesPage`, etc.) is live. |
| 6 | Each centre's gallery for achievements/events | Missing | No gallery table/UI on `CenterDetailPage`. |
| 7 | Dedicated centre updates/feeds space | Missing | No "feed/updates" section on centre pages. |
| 8 | Shift centre details to bottom of each centre page | Missing | `CenterDetailPage` shows address/phone in hero — needs reordering. |
| 9 | Migrate student data from old Admin Panel | Pending | Requires CSV/export from old panel — blocked on you sharing the data file. |
| 10 | Migrate all other databases from old Admin Panel | Pending | Same — needs source export. |

## B. Webpage Changes

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Sameer Sir About: "Mentor of AIR 1, single-digit ranks, Author of 4 best-selling JEE books" | Missing | Sameer entry in `about.ts` lacks this line. |
| 2 | Show Sameer Sir's books on About page | Missing | No books showcase on `AboutPage`. |
| 3 | Add Bansal Alumni page | Done | `/alumni` exists (`AlumniPage.tsx`). |
| 4 | Single-device login restriction | Done | `useSingleDeviceLogin` hook + `active_sessions` table active. |
| 5 | Update photos: Bansal Sir, Sameer Sir, Mahima Ma'am, Neelam Ma'am | Pending | Needs new photo files from you. |
| 6 | Post messages after form / enquiry / payment submission | Partial | Contact form & checkout show toasts, but no branded thank-you screen or post-submit message component standardised across LeadForm/Enquiries/Payments. |

---

## Plan to Close the Gaps

### 1. Centre system upgrades
- **Sort/pin**: `CentersPage` — sort alphabetically by city; force Kota to index 0.
- **Spelling**: Replace "Center(s)" → "Centre(s)" in `PublicLayout`, nav labels, route copy. (Keep route URL `/centers` to avoid breaking links.)
- **Layout reorder**: `CenterDetailPage` — move address/phone/contact block to bottom; lead with gallery + updates.
- **Gallery**: New table `center_gallery (center_id, image_url, caption, sort_order, kind: 'achievement'|'event')` + Centre Portal CRUD + public grid on `CenterDetailPage`.
- **Updates/Feed**: New table `center_updates (center_id, title, body, posted_at, image_url)` + Centre Portal composer + public feed strip on `CenterDetailPage`.
- **Centre login**: Add "Create login" action in `AdminCentersPage` → creates auth user via edge function `admin-create-center-user`, assigns `center_admin` role, links to `center_staff`. Adds "Reset password" too.
- **Bulk Import/Export**: Add `BulkCsvDialog` shared component used by Admin → Centres, Students, Courses, Centre Support. Import via `papaparse`, export via CSV download. Validate rows & report errors.

### 2. About page — Sameer Sir
- Update `src/content/bansal/about.ts` Sameer entry bio line: add AIR 1 / single-digit / author-of-4-books wording.
- New `SameerBooksStrip` on `AboutPage` rendering 4 book cards (cover, title, buy link) pulled from existing `books` table filtered by `author = 'Sameer Bansal'`.

### 3. Post-submission messages
- New shared `SubmissionSuccess` component (branded screen: orange checkmark, headline, sub-line, next-step CTA).
- Wire into: `LeadForm` (landing), `ContactPage`, `CenterCourseEnquiriesPage` (public enquiry), `CheckoutPage` order success, and Razorpay/Stripe payment-success callbacks.

### 4. Data migration (blocked)
- Awaiting CSV export of old Admin Panel (students + related tables). Once provided I'll write a one-shot SQL/edge-function importer.

### 5. Photo updates (blocked)
- Awaiting new images for VK Bansal, Sameer, Mahima, Neelam — I'll swap via `lovable-assets`.

---

## Technical Notes
- New tables `center_gallery`, `center_updates` will follow the standard pattern: GRANTs + RLS (public SELECT where `is_published=true`; centre_admin/admin write within their centre).
- Edge function `admin-create-center-user` uses `service_role` to create auth users; only `admin`/`super_admin` may invoke.
- CSV utilities: add `papaparse` dependency.
- "Centre" rename: copy-only, no route changes, so no SEO regressions.

---

## Suggested Build Order
1. Spelling normalisation + alphabetical/Kota-pin sort (small, fast wins).
2. CenterDetailPage layout reorder.
3. Centre gallery + updates (DB + admin + public).
4. Centre login creation in Admin.
5. Bulk CSV import/export.
6. Sameer Sir bio + books strip.
7. Branded post-submission success screen.
8. (When unblocked) Photo swaps + old-panel data migration.

Reply with "go" to implement in this order, or tell me which subset to tackle first.
