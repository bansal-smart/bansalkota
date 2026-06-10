## Goal
Restyle `/about/:slug` (VK Bansal, Sameer, Mahima, Neelam) so each page feels like a magazine feature: the person's photo dominates as a full-bleed cinematic hero, with bold typography and an attractive, well-paced story below. Brand palette (navy + orange) stays.

## Scope
Only `src/pages/LeadershipDetailPage.tsx`. Main `/about` page, data, and routes stay untouched.

## New layout

```text
┌──────────────────────────────────────────────────┐
│  FULL-BLEED HERO (100vw, ~85–90vh)               │
│  ┌─ Portrait fills entire frame ─┐                │
│  │  dark navy gradient overlay   │                │
│  │  bottom-left content stack:   │                │
│  │    ◂ Back to About            │                │
│  │    Eyebrow: role chip         │                │
│  │    HUGE display name (clamp,  │                │
│  │      up to 7–8rem, tight)     │                │
│  │    Tag pills row              │                │
│  │    Scroll hint ↓              │                │
│  └───────────────────────────────┘                │
└──────────────────────────────────────────────────┘

┌──── Pull-quote band (cream, oversized italic) ───┐

┌──── Intro paragraph (large lead text, max-w-3xl)─┐

┌──── Story sections (alternating, numbered 01/02) │
│     left: big number + orange rule               │
│     right: heading + body                        │
└──────────────────────────────────────────────────┘

┌──── Recognition card (navy, orange accent) ──────┐

┌──── Sticky-feel CTA footer (Enquire / Back) ─────┘
```

## Key visual moves
- **Hero**: replace current split layout with `min-h-[85vh]` full-bleed `<img>` using `object-cover object-top`, layered with a navy gradient (`from-bansal-blue-dark/95 via-bansal-blue/40 to-transparent`) so text stays legible. Subtle orange glow blob top-right.
- **Name typography**: `font-display font-extrabold tracking-tight text-[clamp(2.75rem,9vw,7rem)] leading-[0.9]`, white with orange accent on last word.
- **Fallback** (when no photo): keep initials block but scale to full-bleed with the same gradient.
- **Quote band**: full-width cream strip, large serif-feel italic quote, oversized Quote icon as decorative watermark.
- **Sections**: drop card grid in favor of a numbered editorial list — `01`, `02` in giant orange display numerals on the left, heading + paragraph on the right; thin orange rule between items.
- **Recognition**: navy panel with orange heading, slight inset shadow.
- **Spacing & rhythm**: generous `py-20/24`, `max-w-4xl` body, refined letter-spacing on headings.
- **Motion**: light fade/slide-up on hero text and section reveals using CSS (no new deps).

## Technical notes
- File touched: `src/pages/LeadershipDetailPage.tsx` only.
- Keep existing `profiles` data, `leadershipPhotos` lookup, routing, and props — purely presentational rewrite.
- Continue using `BansalBadge` / `BansalButton`; drop `BansalCard` for the section list in favor of plain semantic blocks.
- Use existing Tailwind tokens (`bansal-blue`, `bansal-blue-dark`, `bansal-orange`, `bansal-cream`, `bansal-gray`) — no new colors.
- Ensure mobile: hero collapses to `min-h-[70vh]`, name clamps down, content stack stays bottom-left with safe padding.
- Image: keep `loading="eager"` on hero, add `fetchPriority="high"`.

## Out of scope
- Main About page, leadership grid, data edits, new photos, route changes.
