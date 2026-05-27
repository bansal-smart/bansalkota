
# Phase 1 — Bansal Classes Rebrand + Home + Mock OTP Auth

Goal: convert the public face of the app to Bansal Classes Pvt Ltd, swap the email/password login for a mock Mobile+OTP flow, and hide non-Bansal pages from navigation. Backend logic (tests, lectures, dashboard, admin) is left intact and reskinned later in Phase 2.

## What changes

### 1. Brand system (global)
- Add Bansal palette as HSL CSS variables in `src/index.css`:
  - `--bansal-blue 220 70% 33%` (#1A3D8F), `--bansal-orange 22 100% 50%` (#FF6A00), blue-dark, blue-light, orange-light, gray, gray-light, black, white.
- Remap existing semantic tokens (`--primary`, `--accent`, `--background`, etc.) to Bansal values so already-themed components inherit the new brand without rewrites.
- Add fonts to `index.html`: Poppins (700/800/600), Inter (400/500), Rajdhani (600).
- Update `tailwind.config.ts` font families: `display: Poppins`, `body: Inter`, `accent: Rajdhani`. Add `bansal-*` colors as Tailwind tokens.
- Update `src/styles/design-tokens.ts` with new palette (kept for legacy imports).
- Replace project title + meta in `index.html` with Bansal copy. Copy `user-uploads://logo.png` to `src/assets/bansal-logo.png` and `public/favicon.png`; wire favicon.

### 2. Shared brand components (new)
Create under `src/components/bansal/`:
- `BansalLogo.tsx` (variant: full | mono | white | mark)
- `BansalButton.tsx` (variant: primary | cta | outline | secondary)
- `BansalCard.tsx` (white card with blue left-border accent)
- `BansalBadge.tsx`, `BansalStat.tsx`, `BansalSection.tsx`

### 3. Public chrome (reskin in place)
- Rewrite `src/components/PublicLayout.tsx`:
  - Sticky white navbar with blue logo. Links: Home, About, Courses, BOOST, Centers, Blog, Careers. Outlined Login + orange "Enquire Now" CTA. Mobile hamburger → blue slide-in.
  - Footer: blue background, 4 cols, real Bansal contact data (Bansal Tower, A-10 IPIA, Kota-324005; admission +91 9773343246 / 8003045222; HR +91 8375015384; BFTP +91 8003046222). Copyright "© 2025 Bansal Classes Private Limited."
  - Remove region selector / Dubai content from header.

### 4. New Home page
- Replace contents of `src/pages/LandingPage.tsx` with the Bansal home as specified:
  1. Hero (navy bg + geometric pattern): "Ideal Guidance. Exceptional Results." (orange "Results."), subline, [Explore Courses] [Enquire Now], hero image placeholder.
  2. Animated stat strip: Daily Live Sessions · 10M+ Resources · 24×7 Support · 100+ Centers.
  3. "Why Bansal Classes" 2-col with orange highlights and [Read More].
  4. Courses preview with JEE / NEET UG / Pre Foundation tabs and 3 cards each.
  5. BOOST banner (navy) → "Register for ₹99" CTA linking out to https://www.bansal.ac.in/boost-registration.
  6. CLP vs DLP cards.
  7. Testimonials carousel.
  8. Orange App CTA section ("Coming Soon on Play Store").
- Add a stub `src/pages/AboutPage.tsx` rebrand pass (hero + leadership cards) so navbar links don't 404. Other listed pages (BOOST, Centers, Careers, Blog, Achievements, Contact) get small placeholder pages with brand chrome and a "Coming soon" notice — full builds happen in Phase 2.

### 5. Mock Mobile + OTP login
- Replace `src/pages/LoginPage.tsx` with a split-layout screen: left blue gradient with logo + tagline + VK Bansal quote; right form.
- Two-step UI: enter +91 10-digit mobile → enter 6-digit OTP (60s resend timer).
- Mock provider: any 6-digit OTP succeeds; create/reuse a Supabase user via email `mobile+91XXXXXXXXXX@bansal.local` with a deterministic password (handled in a new edge function `mobile-otp-mock` so the password never leaves the server). Returns a session the client signs in with.
- New user → second screen asks for Name, then continues to dashboard.
- Remove email/password form and Google login from this page. (Existing `/admin/login` keeps email+password — out of scope.)
- Hide `SignupPage` from public navigation but keep the file (route can redirect to `/login`).

### 6. Navigation hide-list (keep code)
- Remove from `PublicLayout` nav: region pages, mentorship marketing, store, admissions, association, educators, pricing — anything not in the Bansal page list.
- Routes in `App.tsx` stay defined so deep links don't 404; only nav links and CTAs are pruned.

### 7. Cleanup
- Update `mem://index.md` Core: new brand (Bansal blue/orange, Poppins/Inter/Rajdhani), India-only, mock OTP for now. Remove Dubai/AED line.

## Out of scope (Phase 2+)
- Full BOOST page with eligibility + apply tabs.
- Test engine UI reskin, video lectures UI reskin, student dashboard reskin.
- Centers map, Careers + BFTP, Blog, Achievements, Contact form, WhatsApp/Call mobile bar.
- Real SMS OTP (Twilio/MSG91), Razorpay BOOST payment.
- Deleting unused pages/tables.

## Technical notes
- All colors via HSL semantic tokens — no hex in components.
- Mock OTP edge function `supabase/functions/mobile-otp-mock/index.ts` with `verify_jwt = false`; uses `SUPABASE_SERVICE_ROLE_KEY` to upsert the auth user. Returns `{ email, password }` so the client can `signInWithPassword`. Document clearly that this is dev-only.
- No DB migrations needed in Phase 1 (mobile is stored in `profiles.phone` via existing `handle_new_user` trigger).
- Keep `AuthContext`, `ProtectedRoute`, role checks untouched.

After approval I'll implement in this order: tokens & fonts → brand components → PublicLayout → LandingPage → LoginPage + edge function → placeholder pages → memory update.
