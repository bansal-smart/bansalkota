

## Plan: Build Piece 3 — Teacher Dashboard, Admin Panel, Payment Modal & Polish

### Summary
Create 8 new page components for teacher and admin portals, add a reusable payment/enrollment modal, create TeacherLayout and AdminLayout components, and update routing in App.tsx. All pages use mock data, existing orange theme, and Lucide icons. No Supabase/PWA/i18n integration (deferred).

### Scope Decisions
- **Build**: Teacher Dashboard, Create Test, Teacher Doubt Queue, Create Course, Admin Dashboard, Admin Users, Admin Payments, Admin Notifications, Payment Enrollment Modal
- **Skip (deferred)**: PWA setup, i18n (Hindi), AI Edge Functions, Supabase integration, animations polish, offline mode — these require backend connection or are separate tasks
- **Skip (per system rules)**: No PWA service workers added per Lovable PWA guidelines

### Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/TeacherLayout.tsx` | Teacher sidebar + topbar, same pattern as StudentLayout |
| 2 | `src/components/AdminLayout.tsx` | Admin sidebar (dark navy bg) + topbar |
| 3 | `src/pages/TeacherDashboard.tsx` | Stats, upcoming classes, test performance chart, doubt queue, earnings |
| 4 | `src/pages/CreateTestPage.tsx` | 3-step wizard: setup → add questions → review/publish |
| 5 | `src/pages/TeacherDoubtQueuePage.tsx` | Split view: doubt list + answer panel |
| 6 | `src/pages/CreateCoursePage.tsx` | Multi-section form: info, media, curriculum, pricing |
| 7 | `src/pages/AdminDashboard.tsx` | KPIs, revenue chart, recent signups, live status, region pie chart |
| 8 | `src/pages/AdminUsersPage.tsx` | Data table with filters, role badges, bulk actions, detail drawer |
| 9 | `src/pages/AdminPaymentsPage.tsx` | Revenue stats, transactions table, subscription overview |
| 10 | `src/pages/AdminNotificationsPage.tsx` | Send notification form + sent history table |
| 11 | `src/components/EnrollmentModal.tsx` | Plan selection → payment method → success/error states |

### File to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add teacher routes (inside TeacherLayout), admin routes (inside AdminLayout), lazy imports |

### Routing Structure

```text
Teacher routes (inside TeacherLayout):
  /teacher/dashboard      → TeacherDashboard
  /teacher/tests/create   → CreateTestPage
  /teacher/doubts          → TeacherDoubtQueuePage
  /teacher/courses/create  → CreateCoursePage

Admin routes (inside AdminLayout):
  /admin/dashboard        → AdminDashboard
  /admin/users            → AdminUsersPage
  /admin/payments         → AdminPaymentsPage
  /admin/notifications    → AdminNotificationsPage
```

### Layout Components

**TeacherLayout** — Same structure as StudentLayout but with teacher-specific sidebar nav items: Dashboard, My Courses, Live Classes, Create Test, Doubt Queue, My Students, Analytics, Settings. Blue "Teacher Portal" badge under logo.

**AdminLayout** — Dark navy sidebar background (unlike white student/teacher sidebars). Red/orange "ADMIN" badge. Nav: Dashboard, Users, Courses, Live Classes, Tests, Payments, Notifications, Moderation, Settings.

### Key Design Patterns

- All pages use inline mock data arrays (consistent with Pieces 1 & 2)
- Charts use Recharts (BarChart for test performance/revenue, PieChart for regions, AreaChart for revenue trends)
- Tables use standard HTML tables styled with Tailwind (no external table library)
- CreateTestPage uses `useState` for wizard step tracking (step 1/2/3)
- EnrollmentModal uses Dialog from shad