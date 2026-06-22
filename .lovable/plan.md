## Goal

Rewrite the `/new` page with a new section order, fully managed from the admin panel, styled to the Bansal brand (orange #F97316 + navy #1E293B, cream #FFFBF5 bg, editorial display type — same vocabulary as the rest of the site).

## New page structure

```text
1. TOP BANNER       — full-width hero image (16:5), optional overlay headline/subheading/CTA, whole banner can link out
2. HERO + FORM      — title + subtitle + CTA on the left, lead form on the right (no background image now)
3. ABOUT + USPs     — about copy on left, 3–6 USP cards (icon, title, text) on right
4. FEATURED PRODUCTS — 3–6 cards auto-pulled live from DB (test series, courses, books)
5. CTA STRIP        — headline, subheading, button label + link, optional bg image
+ existing footer + StickyMobileCTA
```

Old sections (banner gallery, overview, highlights, outcomes, details, FAQ, contact, footer-form strip) are removed from `/new` rendering and from the admin tabs. The DB columns stay so historical data isn't dropped, but they're no longer surfaced.

## Data model (extend `landing_page_config`)

Add 4 JSONB columns (default `'{}'`):

- `top_banner` — `{ enabled, image_url, alt, headline, subheading, cta_label, cta_link, link }`
- `about` — `{ enabled, eyebrow, title, body, usps: [{ icon, title, text }] }`
- `featured` — `{ enabled, title, subtitle, items: [{ kind: "test_series"|"course"|"book", ref_id, badge?, link_override? }] }`  ← only the reference is stored; title/image/price are fetched live
- `cta` — `{ enabled, headline, subheading, button_label, button_link, background_image_url }`

## Frontend (`/new`)

Refactor `LandingNewPage.tsx` to render the new order with brand styling (cream bg, navy headings, orange accents, `font-display` for H1/H2). Remove `BannerGallery`, `HighlightsGrid`, `OutcomesList`, `DetailsGrid`, `FAQAccordion`, `ContactBlock`, and the existing footer-CTA strip from this page.

New components in `src/components/landing/`:

- `TopBannerSection.tsx` — full-bleed image, optional overlay text + orange CTA pill, wraps in `<a>` if `link` set.
- `AboutUspSection.tsx` — left: eyebrow + title + body. Right: grid of USP cards, each with rounded border, orange icon chip, navy title.
- `FeaturedProductsSection.tsx` — fetches the referenced rows via TanStack Query (`test_series`, `courses`, `books`) in one batched hook. Renders a responsive 3-up card grid (image, title, subtitle, optional badge, "Explore →"). Cards link to `/test-series/:slug`, `/courses/:slug`, `/books/:slug` by default, overridable.
- `FinalCtaSection.tsx` — navy band (or `background_image_url`) with H2 + subheading + orange button.

Modify `HeroSection.tsx` to drop the background-image branch and use a clean cream/white surface with navy text + orange CTA.

## Admin panel (`AdminLandingPage.tsx`)

Replace the current tab list with the 5 new tabs (the legacy editor moves out — old DB data preserved but no longer editable here, since it isn't rendered):

1. **Top Banner** — image upload + URL, alt, headline, subheading, CTA label, CTA link, whole-banner link, enabled switch.
2. **Hero + Form** — keeps current Hero fields (title, subtitle, CTA, start date pill, seats, early-bird countdown) + Form tab fields (city/message toggles, submit label, success message).
3. **About & USPs** — eyebrow, title, body textarea, USP card repeater (Lucide icon name, title, text) with add/remove/reorder.
4. **Featured Products** — repeater. Each row: kind dropdown (Test series / Course / Study material) + searchable combobox that queries the matching table and stores `ref_id`. Optional badge and link override. Preview chip showing the live title/image so the admin sees what will render.
5. **CTA** — headline, subheading, button label, button link, optional background image upload.

Header gets an "Edit /new" badge and a Preview button (already there).

## Brand styling rules applied

- Background `bg-[#FFFBF5]` (cream), headings `text-bansal-navy font-display font-black`, body `text-slate-600`.
- Primary accent uses existing `--primary` (orange) tokens — no hardcoded colors.
- Cards: `rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition`.
- Section spacing: `py-16 lg:py-20`, container `max-w-6xl mx-auto px-4`.

## Files touched

- DB migration: add `top_banner`, `about`, `featured`, `cta` JSONB columns to `landing_page_config`.
- `src/lib/landingSchemas.ts` — new types, extend `LandingConfig`.
- `src/pages/LandingNewPage.tsx` — new render order, remove old sections.
- `src/components/landing/HeroSection.tsx` — drop bg image, brand styling.
- New: `TopBannerSection.tsx`, `AboutUspSection.tsx`, `FeaturedProductsSection.tsx`, `FinalCtaSection.tsx`.
- New hook: `src/hooks/useFeaturedProducts.ts` — batched fetch by `(kind, ref_id)` list.
- `src/pages/AdminLandingPage.tsx` — replace tabs with the 5 new ones, add product picker.

## Out of scope

- No changes to `site_banners` (other pages).
- No deletion of legacy `landing_page_config` columns.
- No changes to lead-form submission or `landing_page_leads`.
