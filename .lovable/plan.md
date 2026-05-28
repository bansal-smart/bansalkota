## Problem

AI-generated visuals inside cards, thumbnails, avatars, and feature blocks are using `object-cover`, which crops them. Only the page hero background banners (the `*-hero.png` files) should be cover-cropped.

## Fix

Audit every `<img>` / background image usage across public pages and switch the non-hero ones from `object-cover` to a non-cropping fit.

### Rules to apply

1. **Hero banner backgrounds (keep as-is)** — the full-width `*-hero.png` in each page header stays `object-cover` (with the navy gradient + decor we already added). These are designed to be cropped/adjusted.

2. **All other images (course cards, educator/mentor portraits, achievement cards, store products, testimonial avatars, stream tiles, illustration blocks, etc.)** — switch to:
   - `object-contain` inside a fixed-aspect container (`aspect-[4/3]`, `aspect-square`, `aspect-[3/4]` depending on slot)
   - Add `bg-muted` (or `bg-bansal-cream/40`) behind so the letterboxing reads as a deliberate frame, not a gap
   - Add `p-2 sm:p-3` padding inside the frame so the subject breathes
   - Keep `rounded-xl` and existing border treatment

3. **Portraits / avatars (educators, mentors, testimonials)** — keep `object-cover` ONLY for true circular avatars (`rounded-full`, faces), since faces are centered and crop safely. Larger portrait tiles switch to `object-contain` with light bg.

4. **Responsive sizing** — ensure containers use `w-full h-auto` or fixed `aspect-*` so nothing stretches; remove any forced `h-64`/`h-72` that fight the contain fit.

### Pages to update (non-hero `<img>`s)

LandingPage, CoursesPage, CourseDetailPage, EStorePage, PackDetailPage, BookDetailPage, TestsLandingPage, TestSeriesCatalogPage, LiveClassesLandingPage, MentorshipPage, EducatorsPage, LeadershipDetailPage, CentersPage, CenterDetailPage, AdmissionsPage, BoostPage, AchievementsPage, AssociationPage, CareerPage, ContactPage, PricingPage, AboutPage, CourseReviews, CartDrawer.

### Out of scope

- Admin/teacher/mentor/student portal layouts (AdminLayout, StudentLayout, TeacherLayout, MentorLayout, profile/settings pages) — those use cover for compact admin UI and are not part of the visual marketing surface.
- Hero banner backgrounds on every public page.
- No new images generated; no layout/copy changes beyond the image-fit pass.

### Technical notes

- Standard replacement pattern:
  ```tsx
  // before
  <img src={...} className="w-full h-48 object-cover rounded-xl" />
  // after
  <div className="aspect-[4/3] w-full rounded-xl bg-muted/60 overflow-hidden flex items-center justify-center p-2 sm:p-3">
    <img src={...} className="max-h-full max-w-full object-contain" />
  </div>
  ```
- For grids, aspect ratio enforced at the wrapper keeps card heights equal even with `object-contain`.
- Hero banner pattern (unchanged): `<img className="absolute inset-0 w-full h-full object-cover" />` with navy gradient + `FloatingIcons` overlay on top.
