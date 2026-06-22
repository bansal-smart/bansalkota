## Goal
Bring `src/pages/AboutPage.tsx` (About Bansal Classes) to the same polished, uniform standard as the leader detail pages — consistent spacing rhythm, aligned containers, no irregular padding, fully responsive.

## What's irregular today
- Section paddings drift: `py-10`, `py-16`, `py-16 md:py-24` mixed — feels uneven.
- Container widths jump between sections (no `max-w-` on Teaching/Vision/Leadership grids, `max-w-4xl` on History, `max-w-2xl` on CTA).
- Horizontal padding inconsistent (`px-4` vs `px-4 sm:px-6 lg:px-8`).
- Heading sizes vary (`text-3xl`, `text-3xl md:text-4xl`, no `md:` upscale on most). Eyebrow styles differ from the leader pages.
- Hero H1 wraps awkwardly on mobile because line one is long; tags/CTA stack inconsistently.
- Vision/Mission cards use a 2-col bullet `<ul>` that overflows on narrow phones.
- Leadership grid mixes `md:grid-cols-2 lg:grid-cols-4` but cards have no equal-height anchor.

## Changes to make
All edits in `src/pages/AboutPage.tsx`, layout only — no content, data, or logic changes.

1. **Standardize tokens** (match leader pages)
   - Section padding: `py-16 md:py-24` everywhere except the thin stats strip (`py-10 md:py-12`).
   - Container: `container mx-auto px-4 sm:px-6 lg:px-8` on every section.
   - Inner max-widths: prose `max-w-4xl`, grids `max-w-6xl`, CTA `max-w-3xl`.
   - Use the same eyebrow pattern (`h-px w-12 bg-bansal-orange` + uppercase tracking label) instead of mixed `BansalBadge` styles for section intros.

2. **Hero**
   - Keep founder portrait + overlays.
   - Tighten H1 line breaks: drop hard line breaks, let it wrap; cap at `clamp(2.25rem, 7vw, 5.75rem)` so mobile doesn't blow out.
   - Wrap content in `max-w-3xl` (was 4xl) for tighter alignment with leader hero.
   - Ensure CTA row uses `flex-wrap gap-3 justify-start`.

3. **Pull-quote band** — keep, normalize padding to `py-16 md:py-24`, container `max-w-4xl`.

4. **Stats strip** — `py-10 md:py-12`, container with `max-w-6xl`, grid `gap-6 md:gap-8`.

5. **History section**
   - Add the standard eyebrow (replace blue badge with the orange line+label) so it matches leader pages.
   - `max-w-4xl`, `py-16 md:py-24`, heading `text-3xl md:text-5xl`.

6. **Teaching methodology**
   - `py-16 md:py-24`, `max-w-6xl`, centered intro `max-w-3xl mx-auto`.
   - Heading `text-3xl md:text-4xl`, eyebrow standardized.
   - Cards: add `h-full` for equal heights, gap `gap-6 md:gap-8`.

7. **Vision & Mission**
   - `py-16 md:py-24`, `max-w-6xl`.
   - Cards `h-full`; bullet list switches to `grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5` so it never overflows on phones.

8. **Leadership grid**
   - `py-16 md:py-24`, `max-w-6xl`, intro eyebrow standardized, heading `text-3xl md:text-5xl`.
   - Grid `sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8`, cards `h-full`.
   - Add subtle hover lift (`hover:-translate-y-1 transition-transform`) to match leader-page card behavior.

9. **CTA footer**
   - `py-16 md:py-20`, `max-w-3xl`, heading `text-2xl md:text-4xl` (matches leader pages).

10. **Responsive checklist** applied per section:
    - No fixed `whitespace-nowrap` on display text.
    - All grids `gap-6 md:gap-8`.
    - Tag/CTA rows `flex-wrap`.
    - Verified visually at 375 / 768 / 1440 widths.

## Files touched
- `src/pages/AboutPage.tsx` — single-file JSX restructure (imports and data unchanged).

No new assets, routes, schema, or backend changes.

## Verification
- Visit `/about` at 375, 768, 1440 widths via `browser--view_preview`; confirm hero text aligns cleanly, all sections share the same vertical rhythm, leadership cards align in even rows, no overflow on the bullet lists, CTA matches the look of the leader pages' CTA.
