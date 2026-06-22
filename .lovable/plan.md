## Goal
Make `/about/vk-bansal`, `/about/sameer-bansal`, `/about/neelam-bansal`, `/about/mahima-bansal` look polished and identical in structure — fixing alignment, padding, spacing, and the text overlap issues. Only the About Bansal Classes page is left untouched.

## What's wrong today
All four pages share `src/pages/LeadershipDetailPage.tsx`, but the hero has two divergent branches (one custom for Sameer, one for everyone else), uses giant initials behind text that causes the overlap feeling, has `whitespace-nowrap` on the H1 (forces text off-screen on small phones), and the downstream sections (quote, intro, chapters, gallery, timeline, pillars, books) use mismatched paddings (`py-16/20/24/28`) and container widths (`max-w-3xl/4xl/5xl/6xl`), so the rhythm feels irregular.

## New uniform page structure (same for all 4 leaders)

```text
┌─────────────────────────────────────────────┐
│ HERO  (full-bleed bg image + dark overlay)  │
│   • Back link (top-left)                    │
│   • Eyebrow • Name (H1) • Headline • Tags   │
│   • Centered vertically, max-w-3xl          │
│   • Placeholder bg per leader (swappable)   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ PROFILE  (photo + intro side-by-side)       │
│   • Left: portrait card (rounded, shadow)   │
│   • Right: pull-quote + intro paragraph     │
│   • Stacks vertically on mobile             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ CHAPTERS (numbered editorial sections)      │
├─────────────────────────────────────────────┤
│ TIMELINE                                    │
├─────────────────────────────────────────────┤
│ PILLARS / PHILOSOPHY                        │
├─────────────────────────────────────────────┤
│ RECOGNITION  (callout card)                 │
├─────────────────────────────────────────────┤
│ BOOKS  (Sameer only)                        │
└─────────────────────────────────────────────┘
```

## Changes to make

1. **Hero — single unified version, no per-slug branches**
   - Replace the giant-initials background with a full-bleed background image. Use a per-leader placeholder map (existing `leadershipPhotos[slug]` or a neutral campus photo) until the user supplies real backgrounds; expose one constant `LEADER_HERO_BG` so swapping later is one-line.
   - Dark gradient overlay (`from-bansal-blue-dark/90 via-bansal-blue-dark/70 to-bansal-blue-dark/40`) for legibility.
   - Remove `whitespace-nowrap` on the H1, drop the side-portrait Sameer variant (his portrait moves to the Profile section).
   - Centered content: `min-h-[80vh] flex items-center`, content in `container max-w-3xl`, vertical centering — fixes the “too much top margin” complaint and the overlap.
   - Responsive type scale: `clamp(2.25rem, 6vw, 5rem)` for H1, smaller on phones; tags wrap cleanly.

2. **New Profile section (photo + text)** — added right after hero
   - Two-column `md:grid-cols-12`: portrait (cols 5) + text (cols 7) with `gap-10`.
   - Portrait uses `extra.heroPhotoOverride || profile.hero_photo_url || leadershipPhotos[slug]` in a `rounded-2xl` card with subtle shadow and orange accent border.
   - Text column shows pull-quote (if any) + intro paragraph with the drop-cap.
   - Removes the standalone “PULL-QUOTE BAND” and “INTRO LEAD” sections (merged here) so the page doesn't feel like a wall of separate bands.

3. **Uniform spacing & containers across all downstream sections**
   - Standard section padding: `py-16 md:py-24` everywhere (no more 20/28 outliers).
   - Standard container: `container mx-auto px-4 sm:px-6 max-w-6xl` for grids, `max-w-4xl` for prose blocks. Pick one per section type and use it consistently across all four leaders.
   - Standard eyebrow component (small line + uppercase label) reused — already exists inline, just keep dimensions identical (`h-px w-12`, `tracking-[0.25em] text-xs`).

4. **Chapters / Timeline / Pillars / Recognition**
   - Keep current visual treatment but normalize: same vertical padding, same heading sizes (`text-3xl md:text-5xl` for section H2s, `text-xl md:text-2xl` for cards), same `gap-` values.
   - Timeline: fix the alternating-side layout on tablet (currently jumps at `md:`), switch breakpoint to `lg:` so tablets get the cleaner single-rail layout — avoids cramped text overlap.
   - Pillars: equalize card heights via `h-full` on the grid items.

5. **Sameer’s Books and the V.K. continuity ribbon** stay, but their wrapper sections adopt the same `py-16 md:py-24` + `max-w-6xl` rhythm so they don't break the flow.

6. **Mobile responsiveness checklist applied to every section**
   - No `whitespace-nowrap` on display text.
   - All images: `w-full h-auto` with explicit aspect ratios (`aspect-[4/5]` for portraits, `aspect-video` for landscape).
   - Tag rows use `flex-wrap gap-2`.
   - Container side padding `px-4 sm:px-6 lg:px-8` consistently.
   - Verify at 360, 414, 768, 1024, 1440 widths.

## File touched
- `src/pages/LeadershipDetailPage.tsx` — full rewrite of the JSX (logic, hooks, and `extra`/`profile`/`sections` data flow stay identical; `sameerBooks` and the V.K. ribbon stay; only layout/markup changes).

No data, schema, route, or backend changes. No new assets required now — placeholders will be the existing portrait images; the user can drop real hero backgrounds in later by replacing one constant.

## Verification
- Visit `/about/vk-bansal`, `/about/sameer-bansal`, `/about/neelam-bansal`, `/about/mahima-bansal` at mobile (375), tablet (768), and desktop (1440) widths via `browser--view_preview` and confirm: hero text centered with no overlap, photo+text section reads cleanly, equal spacing rhythm down the page.
