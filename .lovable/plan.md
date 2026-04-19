
## Plan: Logo-Only Header + Split PCMB Subjects

User wants two changes:
1. **Header**: Remove "Arke" wordmark and "Inspiring Excellence" tagline — show only the new uploaded logo (which already contains the ARKE wordmark + tagline). Make it large and clearly visible.
2. **Subjects**: Replace the single "PCMB" pill with **separate** subjects — Physics, Chemistry, Biology, Maths, Science (5 individual openings instead of 3 grouped ones).

### Changes

**1. Replace logo file** (`src/assets/arke-logo.jpeg`)
- Copy newly uploaded `IMG_4979.JPG` over the existing `arke-logo.jpeg`. Since the logo image has a wide aspect ratio (logo + wordmark), display it at a larger fixed height with `object-contain` so nothing is cropped.

**2. `src/pages/LandingPage.tsx`**
- **Header**: Remove the `<div>` containing "Arke" text and "Inspiring Excellence". Replace small square logo with a wider rectangular logo image:
  ```
  <img src={arkeLogo} alt="Arke" className="h-10 sm:h-12 w-auto object-contain" />
  ```
  Keep the phone link on the right.
- **Footer**: Same — logo only (slightly smaller, `h-7 sm:h-8 w-auto object-contain`), drop separate text branding. Keep "© Arke" copyright text.
- **Openings array**: Replace 3 grouped items with 5 individual subjects:
  ```
  Physics, Chemistry, Biology, Mathematics, Science  (all Class 8–10)
  ```
  Update grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-5` so 5 cards lay out cleanly across breakpoints. Remove the `sub` field logic since it's no longer needed.

**3. `src/components/EducatorApplicationDialog.tsx`**
- Update `SUBJECTS` constant to remove "PCMB" (kept individual subjects only):  
  `["Physics", "Chemistry", "Biology", "Mathematics", "Science"]`

### Files Modified
| File | Change |
|------|--------|
| `src/assets/arke-logo.jpeg` | Replace with new uploaded logo |
| `src/pages/LandingPage.tsx` | Logo-only header/footer; split PCMB into 5 subjects; 5-col grid |
| `src/components/EducatorApplicationDialog.tsx` | Remove PCMB from subject dropdown |

No DB changes. No routing changes.
