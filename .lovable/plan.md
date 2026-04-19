
The user wants to pivot the entire app to a "Coming Soon" landing page for **Arke** (rebrand from Arambh) with only:
1. Hero/Coming Soon section
2. "What is the platform" section (what we do)
3. Current openings: Educators for Class 8th–10th — Maths, Science, PCMB
4. "Apply Now" button → opens existing educator application form (already built, sends to admin)
5. Logo: the uploaded ARKE logo
6. Hide everything else (no nav links to courses, tests, login, signup, dashboards, etc.)
7. Rename Arambh → Arke everywhere

Let me check key files quickly to confirm scope.

## Plan: Rebrand to Arke + Coming Soon Landing Only

### 1. Add Logo Asset
- Copy uploaded logo → `src/assets/arke-logo.png`
- Use in landing header + footer

### 2. Rebuild Landing Page (`src/pages/LandingPage.tsx`)
Replace entirely with a focused single-page "Coming Soon" layout:

- **Top Bar**: ARKE logo + tagline "Inspiring Excellence" only. No nav links. No login/signup buttons.
- **Hero / Coming Soon**: Large "Coming Soon" headline, subtext "India & Dubai's next-generation learning platform — launching soon", animated gradient background (orange + navy from logo)
- **What is Arke (About)**: Brief 3-card section explaining the platform — Live Classes, Personalized Learning, Expert Educators
- **Current Openings**: Highlighted card —  
  - "We're Hiring Educators"  
  - Subjects: Mathematics, Science, PCMB (Physics, Chemistry, Maths, Biology)  
  - Classes: 8th – 10th  
  - Big "Apply Now" CTA → opens existing `EducatorApplicationDialog`
- **Footer**: ARKE logo, copyright, contact email

### 3. Lock Down Routing (`src/App.tsx`)
- Keep only `/` (landing) as a public route
- Redirect ALL other routes (`/login`, `/signup`, `/courses`, `/student/*`, `/teacher/*`, `/admin/*`, etc.) → `/` via a catch-all `<Navigate to="/" replace />`
- **Exception**: keep `/admin/educator-applications` accessible (admin needs to view submissions) but unlinked from UI — accessible only by typing URL. Optionally keep `/admin` dashboard route too for admin access.

### 4. Update Educator Application Dialog
- Pre-fill subject dropdown to include: Mathematics, Science, Physics, Chemistry, Biology, PCMB
- Add a "Class Level" field (8th, 9th, 10th) so admin sees what they applied for
- Confirm submission still inserts to `educator_applications` table (already routes to admin) — no DB change needed unless we add `class_level` column

### 5. Database (small migration)
- Add `class_level` (text) column to `educator_applications` table — optional/nullable so existing rows are fine

### 6. Rebrand Arambh → Arke
- Search & replace across: `LandingPage.tsx`, `EducatorApplicationDialog.tsx`, `index.html` (title + meta), `AdminLayout.tsx`, any page still showing the brand name
- Update toast messages: "Welcome to Arke!" instead of "Welcome to Arambh!"
- Update `index.html` `<title>` and Open Graph tags

### 7. Files to Modify / Create

| File | Action |
|------|--------|
| `src/assets/arke-logo.png` | NEW (copy from upload) |
| `src/pages/LandingPage.tsx` | Rewrite — Coming Soon layout |
| `src/App.tsx` | Reduce routes to `/` + admin-only + catch-all redirect |
| `src/components/EducatorApplicationDialog.tsx` | Add class_level field, update subject options, rename |
| `src/pages/AdminEducatorApplicationsPage.tsx` | Show class_level column |
| `index.html` | Update title, meta, favicon to Arke |
| `supabase/migrations/...` | Add `class_level` column |

### Notes
- All other built pages (Student/Teacher/Admin dashboards, Courses, Tests, etc.) stay in the codebase but become unreachable from UI — preserved for post-launch.
- Admin application review page (`/admin/educator-applications`) remains accessible by URL so you can monitor incoming applications.
- After approval: clicking "Update" in publish dialog deploys the coming-soon page to arke.pro.
