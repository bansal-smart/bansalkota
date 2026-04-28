# Navbar restructure, hero copy update, new mentorship & admissions pages

## 1. Navbar — both `PublicLayout.tsx` and `LandingPage.tsx`
Replace the 5 nav items with exactly 3:
- **Courses** → `/courses` (existing)
- **Mentorship** → `/mentorship` (new page)
- **Admission/Scholarship** → `/admissions` (new page, replaces Pricing link)

Remove: Tests, Live Classes, Educators, Pricing from the nav (routes stay alive in case of direct links; only the navbar links change).

The footer "Explore" column auto-updates because it maps over the same `navItems` array in `PublicLayout.tsx`.

## 2. Footer — `PublicLayout.tsx`
Add **"Join as mentor"** link under the Company column (or as a dedicated item), routing to `/career`.

## 3. Hero copy — `LandingPage.tsx`
- Replace tagline `"JEE · NEET · Board Exams | India & Dubai"` with `"Schooling · Olympiads · Competitive Exams"`.
- Replace the 3 stat chips:
  - `Users` icon → **Global Presence**
  - `Monitor` icon → **Live Classes**
  - `Award` icon → **Unleashing Potential**

## 4. New page: `MentorshipPage.tsx` (route `/mentorship`)
A polished marketing page with these sections, using existing design tokens (orange/navy, Mulish/Plus Jakarta Sans, Lucide icons, no emojis):

1. **Hero band** — "Mentorship by IITians, IIMians & AIIMS doctors" with badge chips for IIT Delhi, Bombay, Kharagpur, Madras, Kanpur, Roorkee, IIM, AIIMS.
2. **Built by toppers, for toppers** — Statement that the platform is programmed and designed directly by IITians, IIMians and AIIMS alumni. Three cards (GraduationCap / Briefcase / Stethoscope-style icons).
3. **The biggest problem: Illusions** — Highlight card explaining that during preparation students fall into illusions (wrong direction, wrong shortcuts, false confidence) and how 1:1 mentorship dissolves them.
4. **Fortnightly Google Meet with your IITian mentor** — Feature block: every 15 days, a direct Google Meet call with the assigned IITian mentor for non-academic guidance (motivation, time management, college life, doubts about strategy). Calendar/Video icons.
5. **How it works** — 4-step strip: Enroll → Get matched with an IITian mentor → Connect every 15 days on Google Meet → Resolve illusions, stay on track.
6. **CTA** — "Book Your Mentor" → `/signup`.

## 5. New page: `AdmissionsPage.tsx` (route `/admissions`)
Replaces Pricing in the navbar. Sections:

1. **Hero** — "Admissions & Scholarships" subtitle "Find the right program and apply for merit-based scholarships."
2. **Admission steps** — 4-step process (Choose Program → Submit Application → Scholarship Test → Confirm Seat).
3. **Scholarship tiers** — 3 cards (Bronze 25%, Silver 50%, Gold 100%) with eligibility criteria and Lucide trophy/medal icons.
4. **Eligibility & Documents** — Two-column checklist.
5. **CTA** — "Apply Now" → `/signup` and "Talk to counsellor" → `/contact`.

## 6. Routing — `App.tsx`
Add inside the existing `PublicLayout` route block:
```tsx
<Route path="/mentorship" element={<MentorshipPage />} />
<Route path="/admissions" element={<AdmissionsPage />} />
```
Existing `/pricing`, `/tests`, `/live-classes`, `/educators` routes remain (just unlinked from navbar).

## Files touched
- edit `src/components/PublicLayout.tsx` (navItems + footer link)
- edit `src/pages/LandingPage.tsx` (inline navbar links + hero copy/stats)
- create `src/pages/MentorshipPage.tsx`
- create `src/pages/AdmissionsPage.tsx`
- edit `src/App.tsx` (two new routes + imports)
