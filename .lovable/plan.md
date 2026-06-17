## Goal
Add a banner gallery (carousel/grid) to the `/new` campaign page with 4 starter banners — 2 AI-generated promotional banners + 2 sample banners styled like Bansal course thumbnails — plus admin editing so any banner can be replaced, re-ordered, captioned, linked, or removed.

## Scope

### 1. Generate 4 starter banner images (saved as project assets)
- **AI Banner 1** (premium): "JEE Advanced 2027 Booster Batch" — cinematic editorial, Bansal orange (#F97316) + navy (#1E293B), bold headline typography, students-with-books imagery, white-space heavy.
- **AI Banner 2** (premium): "NEET 2027 Crash Course — Limited Seats" — same brand system, medical/biology motif, countdown vibe.
- **Sample Banner 3** (standard, course-thumbnail style): Subject-card aesthetic matching existing course thumbnails — Physics chapter callout with formulas, navy gradient + orange accent.
- **Sample Banner 4** (standard, course-thumbnail style): Chemistry chapter callout, same card system, distinct color accent.

Stored in `src/assets/landing-banners/` and uploaded via `lovable-assets` so they ship as CDN pointers.

### 2. Frontend — banner gallery on `/new`
- New `src/components/landing/BannerGallery.tsx`: responsive carousel (embla, already in repo) on mobile, 2-up grid on desktop. Each banner shows image + optional caption + optional CTA link.
- Inserted in `LandingNewPage.tsx` right after `HeroSection`.
- Reads `config.banners[]`; falls back to the 4 starter banners when admin hasn't customized.

### 3. Schema additions
- Extend `LandingConfig` with `banners: BannerItem[]` where `BannerItem = { image_url: string; caption?: string; link?: string; alt?: string }`.
- Defaults seeded in `useLandingConfig` so the page is never empty.

### 4. Admin — new "Banners" tab in `AdminLandingPage`
- Add Tab between Hero and Overview.
- List of banner rows: thumbnail preview, Upload (reuses storage bucket `site-content` under `landing-new/banners/`), caption input, link input, alt input, Move up/down, Remove.
- "Add banner" button. "Reset to defaults" button to repopulate the 4 starter banners.
- Saves via existing `upsert` flow (just include `banners` in the payload).

### 5. Database
- One migration: `ALTER TABLE public.landing_page_config ADD COLUMN IF NOT EXISTS banners jsonb NOT NULL DEFAULT '[]'::jsonb;`
- No RLS changes (existing policies cover it).

## Technical details
- Files created: `src/components/landing/BannerGallery.tsx`, 4 image assets + `.asset.json` pointers.
- Files edited: `src/lib/landingSchemas.ts`, `src/hooks/useLandingConfig.ts`, `src/pages/LandingNewPage.tsx`, `src/pages/AdminLandingPage.tsx`.
- Migration: add `banners` jsonb column to `landing_page_config`.
- Reuses existing carousel (`@/components/ui/carousel`) and storage upload pattern already in the admin page.

## Out of scope
- No analytics tracking on banner clicks.
- No A/B testing of banners.
- No scheduled banner activation (just on/off via remove).
