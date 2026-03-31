

## Plan: Color Sync, Country Selection, Dummy Data Refresh, AI Images & Animations

### Summary
Synchronize the orange gradient color theme across all pages, add a country selector on landing/login, replace all teacher/course names with fresh dummy names, add placeholder illustration images to cards, and apply subtle animations throughout.

### 1. Color Theme Sync — Consistent Gradients Everywhere

Update gradient usage across all pages to use a unified orange-based palette instead of ad-hoc colors like `from-blue-500 to-purple-600` or `from-green-500 to-teal-600`.

**Unified gradient palette:**
- Physics: `from-orange-500 to-amber-600` (warm orange)
- Chemistry: `from-primary to-red-500` (orange-red)
- Maths: `from-amber-500 to-yellow-600` (gold)
- Biology: `from-secondary to-emerald-600` (teal-green — kept as accent)
- General/Purple references: `from-primary to-primary-dark`

**Files to update:** `CoursesPage`, `CourseDetailPage`, `QBankPage`, `StudentDashboard`, `CompetePage`, `LandingPage`, `AdminDashboard`, `TeacherDashboard`, `LeaderboardPage`, `AnalyticsPage`, `TestResultPage`

### 2. Country Selection on Landing & Login

- **LandingPage**: Add a country selector banner/modal at the very top or as a floating pill before hero — "Choose Your Region: India | Dubai" — saves to `localStorage` and Zustand store
- **LoginPage**: Add country toggle at top of the right panel before forms
- **SignupPage**: Already has country dropdown — keep as is
- **useAppStore**: Add `country: 'india' | 'dubai'` and `setCountry` to the store, defaulting from localStorage

### 3. Replace All Teacher/Faculty Names

Replace across **all 12+ files** that reference old names:

| Old Name | New Name |
|----------|----------|
| Ramesh Kumar / Ramesh Sir | Vikram Thapar |
| Priya Sharma / Priya Ma'am | Ananya Iyer |
| AK Bansal | Dr. Siddharth Nair |
| Dr. Sunita Rao | Dr. Kavitha Menon |
| Ajay Sir | Rohan Kapoor |
| Neha Ma'am | Meghna Joshi |
| Dr. Meera Patel | Dr. Tara Deshmukh |

Also update student names in chat/doubts:

| Old | New |
|-----|-----|
| Arjun Mehta | Aditya Rajan |
| Priya (student) | Ishita Bansal |
| Rahul Singh | Karan Malhotra |
| Sneha Gupta | Divya Nair |
| Amit Patel | Harsh Agarwal |
| Kavita | Nisha Reddy |
| Vikram Joshi | Saurabh Pillai |

**Files:** `StudentDashboard`, `TeacherDashboard`, `CoursesPage`, `CourseDetailPage`, `LiveClassRoomPage`, `DoubtPage`, `TeacherDoubtQueuePage`, `AdminDashboard`, `AdminUsersPage`, `AdminPaymentsPage`, `LandingPage`, `LeaderboardPage`, `useAppStore`

### 4. AI-Generated Placeholder Images on Cards

Use `placeholder.co` SVG images with brand colors for all card thumbnails:

- **Course cards** (CoursesPage, LandingPage): Add `<img>` with themed placeholder like `https://illustrations.popsy.co/amber/...` or use inline SVG illustrations of books/students
- **Feature cards** (LandingPage): Add small illustration SVGs inline
- **Educator cards** (StudentDashboard): Add avatar-style placeholders
- **QBank topic cards**: Add subject-themed illustration placeholders

Since we can't generate real AI images in code, use `https://placeholder.co/400x200/F97316/FFF?text=Physics` style URLs with our brand orange color, or create simple inline SVG illustrations.

### 5. Animations

Add to `tailwind.config.ts` and apply across pages:

- **fade-in-up**: Cards fade in with slight upward motion on page load
- **hover-lift**: Cards lift on hover (`hover:-translate-y-1 hover:shadow-lg transition-all`)
- **stagger-children**: Stats cards animate in sequence
- **progress-bar**: Width animates from 0 on mount
- **count-up feel**: Use CSS transitions on number elements

Apply `hover:-translate-y-1 transition-all duration-200` to all card components across pages.
Add `animate-fade-in` class to major sections.

### Files to Modify (16 files)

| File | Changes |
|------|---------|
| `src/store/useAppStore.ts` | Add `country` field |
| `src/pages/LandingPage.tsx` | Country selector, new names, images on cards, gradient sync, animations |
| `src/pages/LoginPage.tsx` | Country toggle, name updates |
| `src/pages/SignupPage.tsx` | Minor name cleanup |
| `src/pages/StudentDashboard.tsx` | New teacher names, gradient sync, hover animations |
| `src/pages/TeacherDashboard.tsx` | New names, gradient sync |
| `src/pages/CoursesPage.tsx` | New educator names, gradient sync, card images |
| `src/pages/CourseDetailPage.tsx` | New names, gradient sync |
| `src/pages/LiveClassRoomPage.tsx` | New chat names |
| `src/pages/DoubtPage.tsx` | New names |
| `src/pages/TeacherDoubtQueuePage.tsx` | New student/teacher names |
| `src/pages/AdminDashboard.tsx` | New names, gradient sync |
| `src/pages/AdminUsersPage.tsx` | New names |
| `src/pages/AdminPaymentsPage.tsx` | New names |
| `src/pages/QBankPage.tsx` | Gradient sync, card images |
| `src/pages/LeaderboardPage.tsx` | New names |
| `tailwind.config.ts` | Add fade-in-up, hover-lift keyframes/animations |

