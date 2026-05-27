## What you'll get

1. Cards and hero images scale properly on mobile (no more giant photos on phones)
2. Every "ARKE" / "Aarambh" label replaced with "Bansal Classes" — across all layouts, dialogs, logout, mentor/teacher/admin shells, localStorage keys
3. Dubai region completely removed — India-only, INR only, no country toggle, no Stripe-Dubai mentions
4. Old stock-photo banners removed; new AI-generated illustrations in the Bansal orange + navy palette plug into the homepage

## Files & changes

### A. Mobile responsiveness pass
- `src/pages/LandingPage.tsx` — cap hero image height (`max-h-[420px] md:max-h-none`), shrink section padding on mobile (`py-10 md:py-20`), make achievement / course / mentor cards single-column on `<640px`, tighten font sizes (`text-3xl md:text-5xl`), `object-cover` + fixed aspect ratios on all images
- `src/pages/CoursesPage.tsx`, `EStorePage.tsx`, `TestSeriesCatalogPage.tsx` — switch grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, cap card image aspect to `aspect-[16/10]`, reduce hero padding on mobile
- `src/pages/CourseDetailPage.tsx`, `BookDetailPage.tsx`, `TestSeriesDetailPage.tsx` — stack columns on mobile, constrain media to `max-w-md mx-auto`
- `src/components/PublicLayout.tsx` — collapse utility bar phone numbers behind a single "Call us" link on `<md`, ensure mobile nav drawer works

### B. Brand rename (ARKE → Bansal Classes)
- `src/components/StudentLayout.tsx`, `TeacherLayout.tsx`, `MentorLayout.tsx`, `AdminLayout.tsx` — replace `ARKE` text labels with `Bansal Classes`
- `src/components/LogoutButton.tsx` — "Log out of Bansal Classes?"
- `src/components/OnboardingTracker.tsx`, `GoalSetupCard.tsx`, `EducatorApplicationDialog.tsx`, `EnrollmentModal.tsx`, `FormattedAnswer.tsx`, `QuestionBankPanel.tsx`, `StudentMentorMeetingCard.tsx` — swap brand strings
- `src/pages/AdminLoginPage.tsx`, `ForceChangePasswordPage.tsx`, `AdminLiveClassesPage.tsx`, `AdminEducatorApplicationsPage.tsx`, `AdminDashboard.tsx`, `EducatorsPage.tsx`, `CreateTestPage.tsx`, etc. — swap copy
- `src/store/useAppStore.ts`, `src/hooks/useMentorChat.ts`, `src/lib/progress.ts`, `src/lib/studentReport.ts` — rename `arke-*` localStorage keys to `bansal-*` (with one-time migration read of old key for back-compat)

### C. Remove Dubai region (India-only)
- `src/store/useAppStore.ts` — remove `country` field, `setCountry`, `arke-country` localStorage. Hardcode INR.
- `src/components/EnrollmentModal.tsx` — drop currency switch; INR only; remove Stripe-Dubai line; payment placeholder mentions Razorpay only
- `src/pages/AdminPaymentsPage.tsx`, `AssociationPage.tsx`, `LiveClassesLandingPage.tsx`, `AdminDashboard.tsx` — strip Dubai copy and the India/Dubai/Other student-distribution chart slice
- Any remaining region selector UI removed; profile signup no longer asks country

### D. Visuals — fresh Bansal-themed AI illustrations
Generate 5 new images in orange (`#F97316`) + navy (`#1E293B`) on cream background, modern flat illustration style, Indian students:

| New asset | Replaces | Where used |
|---|---|---|
| `src/assets/bansal-hero-v2.jpg` | `bansal-hero-students.jpg`, `hero-student.png`, `hero-illustration.png` | Landing hero |
| `src/assets/bansal-mentor-v2.jpg` | `bansal-mentor-teaching.jpg` | "Learn from IITians" section |
| `src/assets/bansal-toppers-v2.jpg` | `bansal-toppers.jpg` | Results / Achievements strip |
| `src/assets/bansal-app-v2.png` | `bansal-app-mockup.png` | "Download our app" CTA |
| `src/assets/bansal-pan-india.png` | `bansal-india-map.png` | Centers/Pan-India section |

Delete `src/assets/arke-logo.jpeg`. Update imports in `LandingPage.tsx`, `CentersPage.tsx`, anywhere the old assets are referenced. Remove the "existing banners" block on the landing page that the user flagged.

### E. QA
- Re-screenshot landing at 360px, 768px, 1280px
- Visit `/courses`, `/e-store`, `/test-series`, `/contact` at mobile width
- Confirm: no "Arke", no "Dubai", no oversized images

## Out of scope
- Razorpay live integration (next phase)
- Subdomain centers routing (Phase 4)
- Backend/DB changes — purely frontend + asset work

Reply **approved** to start.