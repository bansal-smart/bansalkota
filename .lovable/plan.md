# Plan

## 1. Landing page cleanup (`src/pages/LandingPage.tsx`)
- Remove the entire "Why Bansal" section (BansalBadge "Why Bansal" → Read More button, ~lines 370–441, including the paired Since-1981 image block).
- Remove the `<ResourcesTeaser />` render and its import (the "Free Forever" section).

## 2. Courses heading (`src/pages/CoursesPage.tsx`)
- Replace `Popular Batches` → `Popular Courses`.

## 3. Footer + utility bar (`src/components/PublicLayout.tsx`)
- Footer email `info@bansal.ac.in` → `admin@bansal.ac.in`.
- Replace Quick Links with: Achievements (`/achievements`), Disclaimer (`/disclaimer`), Terms & Conditions (`/terms`), Privacy Policy (`/privacy`), Refund Policy (`/refund-policy`).
- Fix top-bar "Find a Centre" link `/centers` → `/centres`.

## 4. Editable legal/info pages from admin panel

### 4a. Database
New migration creating `site_pages` (one row per page, identified by slug):
- columns: `slug` (text PK, e.g. `achievements`, `disclaimer`, `terms`, `privacy`, `refund-policy`), `title` (text), `content_html` (text), `updated_at`, `updated_by`.
- Grants: `SELECT` to `anon` + `authenticated` (public read); `ALL` to `service_role`; `INSERT/UPDATE` to `authenticated`.
- RLS: anyone may read; only `admin` / `super_admin` (via existing `has_role`) may insert/update/delete.
- Seed the 5 rows with initial copy fetched from:
  - https://bansal.ac.in/achievements
  - https://bansal.ac.in/disclaimer
  - https://bansal.ac.in/terms-conditions
  - https://bansal.ac.in/privacy-policy
  - https://bansal.ac.in/refund-policy

  For Refund Policy, preserve the previously-agreed 7-day / hard-copy wording the user pinned earlier; only update surrounding copy.

### 4b. Public pages
Update these files to load `content_html` from `site_pages` by slug and render via the project's `prose` styles inside the existing page chrome:
- `src/pages/AchievementsPage.tsx` — keep the dynamic Wall of Fame data; replace only the static intro/marketing copy with the CMS content block.
- `src/pages/DisclaimerPage.tsx`
- `src/pages/TermsOfServicePage.tsx`
- `src/pages/PrivacyPolicyPage.tsx`
- `src/pages/RefundPolicyPage.tsx`

Show a small skeleton while loading; fall back to the seeded HTML if the row is missing.

### 4c. Admin panel
- New folder of admin pages, one per slug, each using the existing `RichTextEditor` (`src/components/RichTextEditor.tsx`) with a Title input, content editor, and Save button that upserts into `site_pages`.
  - `src/pages/AdminPageAchievementsPage.tsx`
  - `src/pages/AdminPageDisclaimerPage.tsx`
  - `src/pages/AdminPageTermsPage.tsx`
  - `src/pages/AdminPagePrivacyPage.tsx`
  - `src/pages/AdminPageRefundPage.tsx`

  All share a tiny internal `<SitePageEditor slug=... />` component to avoid duplication (kept inside the admin pages directory).
- Register the 5 routes in `src/App.tsx` under the existing admin layout.
- Add a sidebar group "Site Pages" in `src/components/AdminLayout.tsx` with one nav link per page (Achievements, Disclaimer, Terms & Conditions, Privacy Policy, Refund Policy).

## 5. Admin testimonials — explicit Edit button (`src/pages/AdminTestimonialsPage.tsx`)
- Switch the always-inline editor to read-only rows.
- Each row shows name, rank label, quote excerpt, rating, region, active toggle, with `Edit` and `Delete` buttons.
- `Edit` (and `Add`) open a shadcn `Dialog` containing the existing fields and a Save button that reuses the current upsert logic.
- No schema changes.

## Out of scope
- No changes to other admin modules.
- No new auth/role definitions; reuse existing admin/super_admin roles.
