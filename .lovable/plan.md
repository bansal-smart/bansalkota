

## Plan: Fix Visibility Issues, Add Landing Page Sections, Polish All Feature Pages

### Problem Analysis
The visibility issues stem from CSS variable misuse:
- `text-muted` (HSL 220 14% 90% = light grey) used on dark navy backgrounds — nearly invisible since both are light/neutral
- `text-card` (white) used correctly on dark bg but `text-card/80` is too faint
- Some pages have white text on light backgrounds or vice versa
- Hero sections on dark gradient use `text-muted` which renders as light grey on dark navy — barely readable

### 1. Fix Visibility Issues Across All Pages

**Key color fixes:**
- On dark navy backgrounds: use `text-white`, `text-white/70`, `text-white/50` instead of `text-muted`, `text-card/80`
- On light backgrounds: ensure `text-foreground` (dark navy) for headings, `text-muted-foreground` (medium grey) for secondary text
- Fix Login/Signup left panel text from `text-muted`/`text-card/80` to `text-white/90`/`text-white/60`
- Fix LandingPage hero: `text-muted` → `text-white/60`, stats → `text-white/70`

**Files to fix:** `LandingPage`, `LoginPage`, `SignupPage`, `CompetePage`, `LeaderboardPage`, `TestListPage`, `QBankPage`, `AnalyticsPage`, `TestResultPage`, `ProfilePage`, `LiveClassRoomPage`

### 2. Expand Landing Page — Add 5 New Sections

Add these sections between existing ones:

1. **"How It Works"** — 3-step visual (Sign Up → Choose Course → Start Learning) with numbered circles and connecting lines
2. **"Class Formats"** — Cards for: 1-on-1 Private Classes, Live Batch Classes, Recorded Lectures — each with description, icon, and "Learn More" link
3. **"Meet Our Educators"** — 4 educator cards with avatar, name, subject, rating, students count, and short bio
4. **"Student Success Stories"** — Testimonial cards with student photo placeholder, quote, exam result, and rank achieved
5. **"Why Arambh?"** — Comparison table or feature grid: Arambh vs Traditional Coaching (Live + Recorded, AI Doubts, Flexible Schedule, Affordable)

Also add to footer: social links row, "Download App" badges, address for India & Dubai

### 3. Feature Pages Polish

Ensure all pages have:
- Proper contrast between text and backgrounds
- Consistent card styling (white bg, border, rounded-2xl)
- Hover animations on all interactive cards
- Proper section spacing

### Files to Modify (16 files)

| File | Changes |
|------|---------|
| `src/index.css` | No changes needed — variables are fine, usage is the issue |
| `src/pages/LandingPage.tsx` | Fix hero text colors, add 5 new sections (How It Works, Class Formats, Educators, Testimonials, Why Arambh), expand footer |
| `src/pages/LoginPage.tsx` | Fix left panel: `text-muted` → `text-white/60`, `text-card/80` → `text-white/80` |
| `src/pages/SignupPage.tsx` | Same fixes as LoginPage |
| `src/pages/CompetePage.tsx` | Fix `text-white/60` already ok — verify all text visible on navy bg |
| `src/pages/LeaderboardPage.tsx` | Fix podium text colors, ensure rank table has proper contrast |
| `src/pages/TestListPage.tsx` | Fix navy header text visibility |
| `src/pages/QBankPage.tsx` | Fix navy header text, ensure topic cards readable |
| `src/pages/AnalyticsPage.tsx` | Fix hero KPI cards text on gradient bg |
| `src/pages/TestResultPage.tsx` | Fix hero section text visibility |
| `src/pages/ProfilePage.tsx` | Fix gradient header text |
| `src/pages/LiveClassRoomPage.tsx` | Fix chat area contrast, video overlay text |
| `src/pages/StudentDashboard.tsx` | Minor fixes — ensure all card text readable |
| `src/pages/CoursesPage.tsx` | Ensure course card text contrast |
| `src/pages/CourseDetailPage.tsx` | Fix gradient hero text |
| `src/pages/DoubtPage.tsx` | Ensure doubt cards have proper contrast |

### Landing Page New Section Details

**Section order (top to bottom):**
1. Country Selector Banner
2. Navbar
3. Hero (existing, fix text colors)
4. Stats Bar (existing)
5. **NEW: "How It Works"** — 3 steps with icons and connecting dotted line
6. Features grid (existing)
7. **NEW: "Class Formats"** — 3 format cards (1-on-1, Live Batch, Recorded)
8. Popular Batches / Courses (existing)
9. **NEW: "Meet Our Educators"** — 4 educator profile cards
10. **NEW: "Student Success Stories"** — 3 testimonial cards
11. Pricing (existing)
12. **NEW: "Why Arambh vs Traditional?"** — comparison grid
13. CTA (existing)
14. Footer (expanded with social links, app badges, addresses)

### Class Formats Content
- **1-on-1 Private Classes**: Personal attention, custom pace, flexible scheduling — for students who need focused mentoring
- **Live Batch Classes**: Interactive group sessions, real-time doubt solving, peer learning — join a batch of 30-50 students  
- **Recorded Lectures**: Learn at your own pace, rewatch anytime, chapter-wise organized — complete course library access

