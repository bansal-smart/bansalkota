# Plan: Student Dashboard PRD for Mobile APP

Create a single, comprehensive Product Requirements Document at `/mnt/documents/Student-Dashboard-Mobile-APP-PRD.md` that the mobile team can use to build the Student Dashboard inside the existing APP. The PRD mirrors the web Student portal (already live at `/dashboard` and related routes) and defines the entry point: a **Dashboard** button on the Profile screen visible only to students.

## What the PRD will cover

### 1. Document header
- Product: Arke Student Mobile APP — Dashboard Module
- Owner, version (v1.0), date (April 28, 2026), status (Draft)
- Related web routes that this mirrors

### 2. Goals & non-goals
- Bring full student learning experience into the APP (parity with web)
- Entry from Profile screen → Dashboard button (students only, role-gated)
- Non-goals: Teacher portal, Admin portal, payment gateway changes

### 3. User personas & access rules
- Only `role = 'student'` users see the Dashboard button
- Teachers/Admins do not see it (role check via `user_roles` table, server-verified)
- Unauthenticated users → redirected to login

### 4. Entry point spec (Profile screen)
- Button placement, label ("Dashboard"), icon (LayoutDashboard from Lucide)
- Visibility rule, tap behavior, deep link (`arke://dashboard` or in-app route)

### 5. Information architecture — Tabs / Screens
Maps every Student web route to a mobile screen, grouped to match the web sidebar:

**Main**
- Home (`/dashboard`) — streak, continue learning, today's classes, recommended
- My Learning (`/my-courses`) — enrolled courses, progress
- Browse Courses (`/courses`) — catalog, filters, View Detail / Enroll Now
- Course Detail (`/courses/:slug`) — hero, tabs (About, Lectures, Tests, PDF Notes, Schedule), sticky purchase card, demo enroll dialog
- Live Classes (`/my-live-classes`) — upcoming/live/past, join CTA, live badge
- Live Class Room (`/live-classes/:id`) — immersive player
- Tests (`/my-tests`) — test list, status, scores
- Test Taking (`/tests/:id/take`) — immersive, auto-save, timer
- Test Result (`/tests/:id/result`) — score, breakdown
- QBank (`/qbank`) — question bank by subject
- Doubts (`/doubts`) — AI Doubt Solver + ask history

**Explore**
- Educators, Compete, My Analytics, Leaderboard

**Account**
- Profile, Settings, Store, Notifications

For each screen: purpose, key data, primary actions, empty/loading/error states.

### 6. Bottom navigation (mobile)
Mirrors the web mobile bottom nav: Home / Learning / QBank / Tests / Store. Other screens accessed via Home cards, drawer, or Profile.

### 7. Functional requirements
- Auth: reuse existing Supabase session; derive `isStudent` from `user_roles`
- Region awareness (India INR / Dubai AED) persisted per user
- Goal selector (IIT JEE, NEET, etc.) carried into screens
- Notifications bell with unread count and realtime updates
- Course enrollment demo flow (dialog → insert into `enrollments`) until payment SDK lands
- PDF Notes: download gated by enrollment
- Progress tracking from `lesson_progress` → `enrollments.progress_percent`

### 8. Non-functional requirements
- Offline-friendly cache for course list, last test result
- Dark/light theme parity with web (Primary `#F97316`, Navy `#1E293B`, bg `#FFFBF5`)
- Fonts: Mulish (headings), Plus Jakarta Sans (body)
- Lucide icons only, no emojis
- Performance budgets, accessibility (contrast, hit targets ≥44pt)

### 9. Data & API contracts
- Reuses existing Supabase tables: `profiles`, `user_roles`, `courses`, `enrollments`, `lesson_progress`, `live_classes`, `tests`, `test_attempts`, `course_pdfs`, `notifications`, `doubts`
- Lists each screen's queries (table + key columns + RLS expectation)
- Edge functions reused: `ai-doubt-solver`

### 10. Navigation map (ASCII)
```text
Profile
  └── [Dashboard] ──► Home
                        ├── Bottom Nav: Home | Learning | QBank | Tests | Store
                        └── More (drawer): Live, Doubts, Educators,
                                           Compete, Analytics, Leaderboard,
                                           Notifications, Settings
```

### 11. Acceptance criteria
- Dashboard button appears only for students
- All listed screens render with real data from existing backend
- Role gating prevents teachers/admins from opening Dashboard
- Theme, fonts, and icons match brand spec
- Course enroll demo dialog works end-to-end

### 12. Open questions / future work
- Native vs WebView per screen (recommendation: native shell + WebView for immersive Test Taking & Lecture Player initially, full native phase 2)
- Push notification provider
- Razorpay (India) / Stripe (Dubai) SDK integration timing

### 13. Appendix
- Glossary
- Reference web routes table
- Brand tokens

## Deliverable
A single markdown file at `/mnt/documents/Student-Dashboard-Mobile-APP-PRD.md` that the mobile team can hand to engineers to start implementation. After approval I will write the file using `code--write` and surface it via a `presentation-artifact` tag for download.
