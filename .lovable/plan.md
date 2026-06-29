## Goal
Whenever an admin/centre user uploads an image, display a clear aspect-ratio hint (e.g. "Recommended: 16:9 — 1920×1080") next to the upload control, derived from how that image is actually rendered on the public site. No backend or schema changes — purely UI labels.

## Approach
1. Audit every image-upload location, inspect the corresponding render component, and determine the true display aspect ratio (convert any pixel guidance into an aspect ratio + suggested resolution).
2. Add a small reusable helper `<AspectRatioHint ratio="16:9" size="1920×1080" note="…"/>` (rendered as muted helper text) in `src/components/admin/AspectRatioHint.tsx` so labelling stays consistent.
3. Drop the hint next to each existing file input / image URL field. No layout overhaul — just an inline helper line under the label.

## Files to update (and ratio to display)

| File | Field | Ratio shown |
|---|---|---|
| `AdminLandingPage.tsx` | Hero banner, Top banner | 16:9 (1920×1080) hero; 21:9 wide (1920×820) top promo |
| `components/admin/LandingHeroBannersEditor.tsx` | Landing hero carousel slides | 16:9 (1920×1080) |
| `AdminBannersPage.tsx` | Sitewide page banners | 16:9 (1920×1080) |
| `AdminAchievementPostersPage.tsx` | Achievement posters | 4:5 portrait (1080×1350) — matches grid card |
| `AdminToppersPage.tsx` | Topper student photo | 1:1 square (600×600) |
| `AdminGalleryPage.tsx` | Album cover + album images | Cover 16:9 (1600×900); images 4:3 (1600×1200) |
| `AdminCentersPage.tsx` | Centre cover image | 16:9 (1920×1080) |
| `AdminBooksPage.tsx` | Book cover | 3:4 portrait (900×1200) |
| `AdminCoursesPage` / `CreateCoursePage.tsx` | Course thumbnail | 16:9 (1280×720) |
| `AdminBatchesPage.tsx` | Batch cover (if image) | 16:9 (1280×720) |
| `AdminCourseContentPage.tsx` / `CenterOnlineCourseContentPage.tsx` | Lecture/chapter thumbnail | 16:9 (1280×720) |
| `CreateTestPage.tsx` / `CreateTestSeriesPage.tsx` | Test/series cover | 16:9 (1280×720) |
| `CenterBannersPage.tsx` | Centre page promo banner | 16:9 (1920×1080) |
| `CenterCarouselBannersPage.tsx` | Centre hero carousel | 16:9 (1920×1080) — matches home hero |
| `CenterGalleryPage.tsx` | Centre gallery photo | 4:3 (1600×1200) |
| `CenterUpdatesPage.tsx` | Centre update/post image | 16:9 (1600×900) |
| `CenterContentPage.tsx` | Centre content thumbnail | 16:9 (1280×720) |
| `CenterCoursesPage.tsx` / `CenterOnlineCoursesPage.tsx` | Course thumbnail | 16:9 (1280×720) |
| `AdminSchoolsPage.tsx` | School logo | 1:1 (512×512) |
| `AdminProfilePage.tsx` / `TeacherSettingsPage.tsx` / `ProfilePage.tsx` | Avatar | 1:1 (512×512) |
| `QuestionEditorDialog.tsx` | Question image | Free / "any ratio, max 2 MB" |

(For each, I'll quickly verify the actual rendered ratio by reading the corresponding card/section component before writing the hint, so the numbers in the table are tightened where needed.)

## Out of scope
- No DB changes, no cropping/auto-resizing, no validation. Just informational helper text. Existing uploads stay as-is.
