

## Plan: Fix Missing Pages, Enhance Auth, Fix Remaining Visibility

### Problem
13 sidebar navigation links lead to routes with no pages (showing 404/blank). The TeacherLayout still shows "Ramesh Sir". Auth pages need minor polish.

### Missing Pages to Create (13 new files)

**Student pages (3):**
| File | Route | Content |
|------|-------|---------|
| `EducatorsPage.tsx` | `/educators` | Grid of educator cards with photo, subject, rating, "Book 1-on-1" button |
| `SettingsPage.tsx` | `/settings` | Account settings: notifications toggle, language, theme, region, password change |
| `StorePage.tsx` | `/store` | Course store with pricing cards, enrollment CTA, filters by subject/exam |

**Teacher pages (5):**
| File | Route | Content |
|------|-------|---------|
| `TeacherCoursesPage.tsx` | `/teacher/courses` | List of teacher's courses with stats, edit/archive actions |
| `TeacherLiveClassesPage.tsx` | `/teacher/live-classes` | Upcoming & past live classes, "Schedule New" button |
| `TeacherStudentsPage.tsx` | `/teacher/students` | Student roster table with name, batch, progress, last active |
| `TeacherAnalyticsPage.tsx` | `/teacher/analytics` | Charts: student engagement, test performance, revenue |
| `TeacherSettingsPage.tsx` | `/teacher/settings` | Profile edit, payout settings, notification preferences |

**Admin pages (4):**
| File | Route | Content |
|------|-------|---------|
| `AdminCoursesPage.tsx` | `/admin/courses` | All courses table with approval status, actions |
| `AdminLiveClassesPage.tsx` | `/admin/live-classes` | All scheduled classes, teacher assignments |
| `AdminTestsPage.tsx` | `/admin/tests` | All tests, approval workflow |
| `AdminModerationPage.tsx` | `/admin/moderation` | Reported content, flagged doubts, user warnings |
| `AdminSettingsPage.tsx` | `/admin/settings` | Platform settings, branding, feature toggles |

**Student live classes list:**
| File | Route | Content |
|------|-------|---------|
| `LiveClassesListPage.tsx` | `/live-classes` | Upcoming live classes grid with "Join" buttons, past recordings |

### Route Updates in App.tsx
Add all 14 new routes under their respective layout groups.

### Auth Page Enhancements
- **LoginPage**: Add navigation — on "Send OTP" / "Login" / "Verify" click, navigate to `/dashboard` using `useNavigate`
- **SignupPage**: On "Create Account" click, navigate to `/login` with success toast

### Fix TeacherLayout
- Change "Ramesh Sir" → "Vikram Thapar" and initials "RS" → "VT"

### Files to Modify (3)
- `src/App.tsx` — add 14 new routes
- `src/components/TeacherLayout.tsx` — fix name
- `src/pages/LoginPage.tsx` — add navigation on login
- `src/pages/SignupPage.tsx` — add navigation on signup

### Files to Create (14)
All pages follow existing pattern: mock data arrays, orange gradient headers, Lucide icons, hover-lift cards, proper text contrast.

