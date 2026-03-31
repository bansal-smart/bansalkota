

## Plan: Build Piece 2 — Tests, Live Class, QBank, Compete, Doubts, Analytics & More

### Summary
Add 13 new page components and update routing to cover all student-facing screens: Test List, Test Taking, Test Result, Live Classroom, QBank, Compete, Doubts, Leaderboard, Analytics, Courses, Course Detail, Lecture Player, and Profile. All pages use the existing orange theme, Lucide icons (no emojis), and reuse existing components (StatCard, SectionHeader, LiveBadge, GoalSelector, StudentLayout).

### Technical Approach
- All pages are static/mock-data UI — no Supabase calls yet (matching Piece 1 approach)
- All pages wrapped inside `StudentLayout` (sidebar + topbar + bottom nav) except Test Taking and Lecture Player (immersive full-screen)
- Use Recharts for charts (already installed)
- Use Lucide icons everywhere (no emojis)
- Keep the orange primary theme established in Piece 1

### Files to Create

| # | File | Route | Notes |
|---|------|-------|-------|
| 1 | `src/pages/TestListPage.tsx` | `/tests` | Search, filters, sub-tabs, 6 test cards |
| 2 | `src/pages/TestTakingPage.tsx` | `/tests/:id/take` | Full-screen immersive, timer, question palette, MCQ options |
| 3 | `src/pages/TestResultPage.tsx` | `/tests/:id/result` | Score hero, rank strip, subject breakdown, charts |
| 4 | `src/pages/LiveClassRoomPage.tsx` | `/live-classes/:id` | Video placeholder, chat panel, controls |
| 5 | `src/pages/QBankPage.tsx` | `/qbank` | Hero cards, subject tabs, topic grid |
| 6 | `src/pages/CompetePage.tsx` | `/compete` | 1v1 battle UI, question box, rank stats |
| 7 | `src/pages/DoubtPage.tsx` | `/doubts` | Split layout: doubt list + ask/detail panel |
| 8 | `src/pages/LeaderboardPage.tsx` | `/leaderboard` | Podium + rank table |
| 9 | `src/pages/AnalyticsPage.tsx` | `/analytics` | KPIs, area chart, radar chart, heatmap, bar chart |
| 10 | `src/pages/CoursesPage.tsx` | `/courses` | Filter row, featured banner, course cards grid |
| 11 | `src/pages/CourseDetailPage.tsx` | `/courses/:slug` | 2-column: content tabs + enrollment card |
| 12 | `src/pages/LecturePlayerPage.tsx` | `/courses/:slug/learn` | Full-screen dark, video + curriculum sidebar |
| 13 | `src/pages/ProfilePage.tsx` | `/profile` | Profile header, stats, tabs (info/subscription/achievements) |

### File to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add all 13 new routes — TestTaking and LecturePlayer outside StudentLayout; rest inside it |

### Key Design Decisions

1. **Test Taking Page** — Rendered outside `StudentLayout` (no sidebar/bottom nav). Own sticky top bar with timer, submit button. Right-side question palette panel. Instructions modal shown initially with a "Start Test" button.

2. **Lecture Player** — Full-screen dark layout outside `StudentLayout`. Custom video controls bar, curriculum sidebar on right.

3. **Live Classroom** — Inside StudentLayout but uses full width. 2-column: video area (left) + chat (right). Chat has mock messages and input bar.

4. **Compete Page** — Dark navy background with grid texture. Two player cards with "VS" badge, health bars, question box with options, rank/streak stats.

5. **Analytics Page** — Uses Recharts `AreaChart`, `RadarChart`, `BarChart`. Subject tabs filter the view. Weak vs strong topic columns.

6. **All emojis** replaced with Lucide icons per established pattern. Country flags → text labels.

### Routing Structure (in App.tsx)

```text
Outside StudentLayout (immersive):
  /tests/:id/take     → TestTakingPage
  /courses/:slug/learn → LecturePlayerPage

Inside StudentLayout:
  /dashboard           → StudentDashboard (existing)
  /tests               → TestListPage
  /tests/:id/result    → TestResultPage
  /live-classes/:id    → LiveClassRoomPage
  /qbank               → QBankPage
  /compete             → CompetePage
  /doubts              → DoubtPage
  /leaderboard         → LeaderboardPage
  /analytics           → AnalyticsPage
  /courses             → CoursesPage
  /courses/:slug       → CourseDetailPage
  /profile             → ProfilePage
```

### Mock Data Strategy
Each page defines its own inline mock data arrays (same pattern as StudentDashboard). No shared data files — keeps pages self-contained and easy to later swap for Supabase queries.

### Scope Boundaries
- No Supabase integration (deferred to backend connection)
- No real video/Agora SDK (placeholder with controls UI)
- No real AI doubt solving (mock AI response panel)
- No payment integration (UI buttons only)
- All interactions are client-side state only (useState)

