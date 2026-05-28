## Goal

Make every public page feel more "Bansal-branded": denser visual storytelling, decorative brand elements in low opacity, properly responsive cards (current ones are oversized on laptops), no awkward blank zones, and more marketing copy around courses & expertise. Start with the Landing page, then propagate the system.

## Phase 1 — Brand Decor System (shared, reused everywhere)

Create a small set of reusable decorative pieces so we don't sprinkle one-off divs across pages.

1. `src/components/bansal/BansalDecor.tsx`
   - `<GridTexture />` — subtle dotted/grid SVG, `opacity-5` to `opacity-10`, navy or orange.
   - `<GlowBlob color="orange|blue" size />` — soft radial blur blob for background depth.
   - `<CornerSparkles />` — small Lucide `Sparkles` + `Star` cluster in low opacity for card corners.
   - `<DiagonalAccent />` — thin orange/navy diagonal line stripes for section dividers.
   - `<FloatingIcons icons={[...]} />` — scattered Lucide icons (Atom, BookOpen, Flask, Calculator, Trophy) at `opacity-10` with subtle float animation.

2. Generate 3 brand decor PNGs (orange/navy palette, transparent backgrounds, low-detail) to layer behind sections:
   - `brand-pattern-formulas.png` — faint physics/chem formulas pattern
   - `brand-pattern-shapes.png` — geometric circles/triangles
   - `brand-pattern-ribbon.png` — soft orange ribbon swoosh

3. Add 2 utility classes to `index.css`:
   - `.section-decor` — relative + overflow-hidden helper
   - `.decor-fade` — radial mask so patterns fade into background

## Phase 2 — Landing Page Redesign

Apply decor + fix layout. Section-by-section:

- **Hero**: keep current banner carousel; add `<FloatingIcons />` behind text, tighten grid to `lg:grid-cols-[1.1fr_1fr]`, reduce banner heights on `lg` (380px → 320px) so it fits 1018px viewport without scroll-overflow.
- **Stats banner**: add `<GridTexture />` behind, add small Lucide icon above each stat number.
- **Achievements row**: cards currently `grid-cols-2 md:grid-cols-4` — keep, but cap card padding (`p-4` not `p-6`), add `CornerSparkles` to each, add `brand-pattern-shapes.png` behind section at `opacity-5`.
- **Streams (JEE/NEET/Foundation)**: cards are `aspect-square` — too tall on laptop. Change to `aspect-[4/5]` on `sm`, `aspect-[3/4]` on `lg`. Add stream icon chip top-left (Atom for JEE, Stethoscope for NEET, Sprout for Foundation). Add 2-line marketing tagline below title that's always visible (not just on hover).
- **Why Bansal**: add `brand-pattern-formulas.png` decor behind image side; expand 4 pillars to 6 with new icons (Microscope, ClipboardCheck added). Add a mini "Expertise stat strip" below pillars (e.g. "12 IIT alumni faculty · 8 PhDs · 40+ AIRs mentored").
- **Courses tabs**: cards too wide on laptop. Make grid `sm:grid-cols-2 lg:grid-cols-3` with `max-w-xs` per card and center. Add per-course bullet list (3 marketing points: "Live + Recorded · Mentor pod · Weekly tests"). Add `<CornerSparkles />`. Add intro paragraph above tabs with stronger marketing copy.
- **CLP vs DLP**: add comparison checkmark list (5 items each), add subtle background blob, equalize card heights.
- **New section: "Bansal Expertise"** between Why-Bansal and Courses — 3-column grid showcasing Faculty depth, Curriculum, Test Engine, with Lucide icons + brand pattern background. Marketing-heavy copy.
- **Testimonials**: add quote-mark decor, brand pattern background, ensure 1/2/3 col responsive.
- **App/Pan-India sections**: tighten spacing, add floating icon decor.

## Phase 3 — Responsive Card Pass (Landing first)

Audit every `BansalCard` usage on landing:
- Padding: `p-4 sm:p-5 md:p-6` instead of fixed `p-6`.
- Text: `text-sm` body, `text-base sm:text-lg` titles (not `text-xl`).
- Icon circles: `h-10 w-10 sm:h-12 sm:w-12`.
- Grid gaps: `gap-3 sm:gap-4 md:gap-6`.
- Add `min-h-0` and ensure no card stretches >360px wide on `lg` for 3-col grids.

## Phase 4 — Roll Out to Other Pages

Once landing is approved, apply the same decor system + responsive card pass to:
About, Courses, EStore, Tests Landing, Live Classes, Mentorship, Educators, Centers, Admissions, Career, Boost, Achievements, Contact, Pricing, Association.

Each page gets:
- One brand pattern decor behind the main content section
- `<FloatingIcons />` behind page heading
- Responsive card padding/grid pass
- 1 extra marketing block where blank space exists

## Technical Notes

- All new colors via existing `bansal-orange`, `bansal-blue`, `bansal-navy` tokens — no raw hex.
- All icons from `lucide-react` (no emojis).
- AI-generated decor PNGs go to `src/assets/decor/`, imported via ES6.
- New component file: `src/components/bansal/BansalDecor.tsx` exports all decor pieces.
- Animations reuse existing `animate-fade-in-up`, add one new `@keyframes float-slow` in `index.css`.
- Container max-width stays `container mx-auto px-4`; no layout shell changes.

## Out of Scope

- Auth, dashboards, admin/teacher/student portals (untouched).
- Backend, data, schema.
- Removing or restructuring navigation.

## Deliverable Order

1. Decor system + 3 generated PNGs
2. Landing page redesigned & responsive
3. Show for review → then propagate to remaining public pages
