# Landing Page Marketing Overhaul + Unified Admin Overview

Two focused workstreams. No backend/schema changes — everything reads from existing tables (`courses`, `centers`, `toppers`, `site_stats`, `site_testimonials`, `site_banners`, `enrollments`, `orders`, `payments`, `enquiries`, `center_courses`, `center_course_enquiries`, `reports`).

---

## 1. Public Landing Page — Sales-First Rewrite

File: `src/pages/LandingPage.tsx` (full restructure, keeps existing hero hooks `useSiteStats`, `useSiteTestimonials`, `useSiteBanners`).

### New section order (top → bottom)

1. **Hero — "India's Most Trusted JEE/NEET Legacy"**
   - Bold headline + sub-headline, 2 CTAs (Explore Courses / Book Free Counselling), trust strip (45+ Yrs · 2L+ Selections · 50+ Centres · 4.8★).
   - Right-side: layered image collage (mentor, toppers, app mockup) with floating "Live class now" + "Rank 1 AIR" badges.

2. **Marquee Trust Bar** — exam logos, partner schools, "Featured in" press strip.

3. **Why Bansal — 4 pillar bento grid** (Legacy, Faculty, Results, Pan-India).

4. **Choose Your Goal — Exam Selector** (JEE / NEET / Foundation / Olympiad)
   - Tabs that swap into a 3-card "Recommended Programs" rail pulled from `courses` table (filtered by exam slug, `is_published=true`, ordered by `is_featured`, limit 3). Each card: thumbnail, title, duration, mode badge (Online/Offline/Hybrid), price (₹/AED based on region), "View Details" + "Enroll Now".

5. **Course Formats Explainer** — 3 columns: Classroom (CLP), Distance (DLP), Online Live. Each with feature list, sample faculty, "Best for…" line, CTA.

6. **Live & Upcoming Batches Strip** — horizontal scroll of next 6 batches from `courses` where `start_date >= today`. Countdown chip + seats-left bar.

7. **Toppers Wall** — masonry grid from `toppers` table (top 8 by rank), with AIR badge, exam, year, centre. "See all 5000+ selections →".

8. **Centres Across India + Dubai** — interactive map illustration + searchable centre cards (from `centers`). Filter by city. Each card → `/centers/:slug`.

9. **Student Outcomes / Stats counter band** — animated counters from `site_stats`.

10. **Free Resources Teaser** — Sample papers, NCERT solutions, YouTube masterclasses, AI Doubt Solver demo. Drives signup.

11. **Testimonials carousel** — from `site_testimonials` with parent + student split tabs.

12. **App Download Band** — phone mockup, QR, Play/App Store buttons, feature checklist (offline lectures, AI planner, mock tests).

13. **Pricing & Scholarship Band** — "BOOST Scholarship Test" promo card + "EMI from ₹X/mo" + "100% refund in 7 days".

14. **FAQ accordion** (10 sales-objection questions).

15. **Final CTA banner** — "Start Your Rank Journey Today" with counselling form (name, phone, class, exam) → writes to `enquiries` with `source_type='landing_cta'`.

16. **Footer enhancements** — sitemap, exam pages, centre cities, social, app links, compliance.

### Copy & visual rules
- Every section has a unique headline + one-line subhead — no recycled wording.
- Heading font Mulish, body Plus Jakarta Sans. Primary `#F97316`, navy `#1E293B`, cream `#FFFBF5` per project core memory.
- Lucide icons only, no emojis.
- New seeded images via `imagegen` (premium for any with text/badge), stored in `src/assets/landing/`:
  - `hero-collage-mentor.jpg`, `hero-collage-toppers.jpg`, `hero-collage-app.png`
  - `goal-jee.jpg`, `goal-neet.jpg`, `goal-foundation.jpg`, `goal-olympiad.jpg`
  - `format-classroom.jpg`, `format-distance.jpg`, `format-online.jpg`
  - `centres-map-illustration.png`
  - `resources-ai-doubt.jpg`, `resources-mock.jpg`
  - `app-mockup-v3.png`
  - `scholarship-banner.jpg`
- Microanimations: subtle parallax on hero collage, count-up on stats (intersection observer), card lift on hover, marquee for trust bar.

### New small components (under `src/components/landing/`)
- `HeroCollage.tsx`, `TrustMarquee.tsx`, `GoalSelector.tsx`, `CourseRail.tsx`, `FormatCards.tsx`, `UpcomingBatches.tsx`, `ToppersWall.tsx`, `CentresShowcase.tsx`, `OutcomesStats.tsx`, `ResourcesTeaser.tsx`, `AppDownloadBand.tsx`, `ScholarshipBand.tsx`, `LandingFAQ.tsx`, `LandingCTAForm.tsx`.

### Data hooks (new, read-only)
- `useLandingCourses(examSlug)` — `courses` filtered + ordered.
- `useUpcomingBatches()` — `courses` upcoming start_date.
- `useTopToppers(limit)` — `toppers` ordered by rank.
- `useCentresShowcase()` — `centers` with city grouping.

---

## 2. Admin Overview — Unified Command Centre

File: `src/pages/AdminDashboard.tsx` (rewrite of the overview page, keeps route).

### New layout

```text
┌──────────────────────────────────────────────────────────┐
│ Greeting + date + "Today snapshot" KPI strip (6 cards)   │
│ Students · Active Courses · Centres · Revenue (₹+AED)    │
│ · Pending Enquiries · Open Centre Tickets                │
├──────────────────────────────────────────────────────────┤
│ Revenue chart (30d, area)  │  Enrollments chart (30d)    │
├──────────────────────────────────────────────────────────┤
│ Centres at-a-glance table  │  Top Courses leaderboard    │
│ (city, students, revenue,  │  (title, enrolments, rev,   │
│  open tickets, → Manage)   │   conversion, → View)       │
├──────────────────────────────────────────────────────────┤
│ Recent Enquiries feed  │ Live Classes today │ Pending    │
│ (landing+centre mixed) │ (status, attendees)│ moderation │
├──────────────────────────────────────────────────────────┤
│ Quick Actions grid: New Course · New Banner · Add Centre │
│ · Add Topper · Add Testimonial · Broadcast Notification  │
└──────────────────────────────────────────────────────────┘
```

### Data sources (all existing tables, parallel `react-query`)
- KPIs: counts from `profiles`, `courses (is_published)`, `centers`, sum `payments.amount` (current month, split by currency), `enquiries` where status='new', `enquiries` where source_type='center_support' & status!='closed'.
- Revenue chart: `payments` last 30d grouped by day + currency.
- Enrollments chart: `enrollments` last 30d grouped by day.
- Centres table: join `centers` + counts of `profiles.center_id` + sum `payments` via `enrollments`→`courses`→`center_id` (fallback: order by created students). Reuse simple per-centre RPC if too heavy; otherwise client-side aggregate over a single windowed query.
- Top courses: `enrollments` grouped by course_id, top 5.
- Recent enquiries: `enquiries` order desc limit 8, badge by `source_type`.
- Live classes today: `live_classes` where `scheduled_at::date = today`.
- Moderation queue: `reports` where status='open' limit 5.

### New components (`src/components/admin/overview/`)
- `KpiStrip.tsx`, `RevenueChart.tsx`, `EnrollmentChart.tsx`, `CentresGlance.tsx`, `TopCoursesCard.tsx`, `RecentEnquiriesFeed.tsx`, `TodayLiveClasses.tsx`, `ModerationQueueCard.tsx`, `QuickActionsGrid.tsx`.
- Charts via existing `recharts` already in project.

### Hooks
- `useAdminOverview()` — single hook orchestrating parallel queries, returns `{ kpis, revenueSeries, enrollSeries, centres, topCourses, enquiries, liveToday, moderation, isLoading }`.

### UX details
- Skeletons per card while loading, no full-page spinner.
- Currency toggle (INR / AED) on revenue card.
- Each card has a "View all →" link to its existing admin module.
- Respects roles: super_admin sees everything; admin sees same minus revenue totals (kept simple — single page, conditional render via `useAuth().isSuperAdmin`).

---

## Out of scope
- No DB migrations, no edge functions, no auth changes.
- No changes to the Centre Panel or Student Portal.
- No changes to existing admin sub-pages (only the overview).

## Acceptance
- Landing page is visually richer, every section has unique copy and imagery, and the CTA form writes to `enquiries`.
- Admin overview loads under 2s with skeletons, shows live counts across centres/courses/revenue/enquiries, and links into the relevant modules.
