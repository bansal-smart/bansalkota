## Plan

### 1. Navigation: About dropdown (5 items)
Update `src/components/PublicLayout.tsx` — replace the single "About" link with a dropdown menu (hover/click) using existing shadcn `NavigationMenu` or a lightweight custom dropdown matching current nav styling. Items:
1. About Bansal Classes → `/about`
2. About VK Bansal Sir → `/leadership/vk-bansal`
3. About Sameer Bansal Sir → `/leadership/sameer-bansal`
4. About Neelam Bansal Ma'am → `/leadership/neelam-bansal`
5. About Mahima Bansal Ma'am → `/leadership/mahima-bansal`

Mobile menu: render the 5 items as an expandable section.

Individual leadership pages already exist at `/leadership/:slug` via `LeadershipDetailPage.tsx` for all 4 family members — no new pages needed. I'll verify the slugs render and polish any missing content (photo placeholder, tagline) for the 3 non-VK profiles to ensure they feel complete.

### 2. About Bansal Classes page redesign (`src/pages/AboutPage.tsx`)
Completely rebuild the page with a premium, editorial feel:

- **Hero — "Our Guiding Light"**: Two-column layout. Left = large portrait of VK Bansal Sir (generated AI portrait, respectful illustrated style — saved to `src/assets/vk-bansal-portrait.jpg`) with a soft glow frame and "Forever Honored" badge. Right = headline "Bansal Classes — Born from a Father's Vision", subhead crediting VK Bansal Sir as founder, guiding light, and eternal inspiration, plus CTA "Read His Full Story" → `/leadership/vk-bansal`.
- **Legacy strip**: Founded 1981 · 40+ years · 100+ centres · Daily live sessions (uses `bansalStats`).
- **Our Story**: 3-paragraph narrative on Kota origins, JEE legacy, and modern transformation.
- **Teaching Methodology**: 3-card grid from `teachingMethodology` (CLP / DLP / Online).
- **Vision & Mission**: Two-column with icon bullet lists from `visionPoints` / `missionPoints`.
- **Leadership at a glance**: 4-card row linking to each leader's detail page (uses `leadership` array).
- **CTA band**: "Visit a Centre" + "Explore Courses".

All sections use existing Bansal design tokens (`bansal-blue`, `bansal-orange`, `bansal-blue-light`), `BansalCard`, `BansalButton`, Mulish/Plus Jakarta Sans fonts, and Lucide icons (no emojis).

### 3. Home page: Featured Courses section (`src/pages/LandingPage.tsx`)
Add a new section "Featured Courses" placed above the existing CLP/DLP block:

- Section header with title + "View All" link → `/courses`.
- Responsive grid (`md:grid-cols-2 lg:grid-cols-3`) of 6 featured course cards.
- Each card: AI-generated thumbnail, course title, exam badge (JEE/NEET/Foundation), short tagline, "Explore" CTA linking to `/courses` (or course detail if a matching slug exists).

**AI-generated thumbnails** (saved to `src/assets/`, fast tier, 1024×768):
1. `course-jee-main.jpg` — JEE Main: geometric math/physics motifs, blue gradient
2. `course-jee-advanced.jpg` — JEE Advanced: premium dark-blue with formula glow
3. `course-neet-ug.jpg` — NEET UG: DNA/molecule biology theme, teal/green
4. `course-foundation.jpg` — Class 8-10 Foundation: friendly classroom illustration, warm orange
5. `course-dropper.jpg` — Dropper Batch: focused student silhouette, deep navy + orange
6. `course-crash.jpg` — Crash Course: clock + rocket motif, vibrant orange

Each thumbnail rendered with `rounded-2xl`, `hover-lift`, gradient overlay for title legibility.

### Technical Details
- **Dropdown component**: Use shadcn `NavigationMenu` (already in `src/components/ui/`) for desktop; reuse mobile sheet pattern already in `PublicLayout`.
- **Image generation**: `imagegen--generate_image` with `model: "fast"` for all 7 images (6 course thumbs + 1 VK portrait — portrait uses `standard` for higher fidelity).
- **No backend changes**, no schema changes, no new routes (leadership routes already exist).
- **Files changed**: `PublicLayout.tsx`, `AboutPage.tsx`, `LandingPage.tsx`.
- **Files created**: 7 image assets in `src/assets/`.

### Out of scope
- Editing the 4 leadership detail pages' copy (they already exist and are populated). I'll only verify they render; deeper rewrites can be a follow-up.
- Course data model changes — featured courses are presentational cards on the landing page linking to existing `/courses` flow.