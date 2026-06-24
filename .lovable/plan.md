## Changes

**1. Wall of Fame CTA text** — `src/components/landing/ToppersWall.tsx` line 58
Change `See all 5,000+ selections` → `See all selections`.

**2. FAQ — exam list** — `src/components/landing/LandingFAQ.tsx` line 12
Remove `NTSE` from the answer:
`JEE Main, JEE Advanced, NEET-UG, Foundation (Class VI–X) & Olympiads. Dedicated batches exist for repeaters and droppers.`

**3. FAQ — centre answer** — `src/components/landing/LandingFAQ.tsx` (Q "Do you have a centre in my city?")
Replace answer with:
`Bansal operates 100+ centres across India. Use the Centres section above to find the one nearest you — or learn online with the same faculty.`
(Drops "and Dubai".)

**4. About page "Visit a Centre" link** — `src/pages/AboutPage.tsx` lines 75 and 357
Change `to="/centers"` → `to="/centres"` (both occurrences).

**5. Hero carousel navigation arrows** — `src/pages/LandingPage.tsx` lines 259–290
Replace the auto-scrolling CSS marquee with a proper controlled carousel:
- Track current index in state; show one banner at a time with a sliding transform.
- Add left/right arrow buttons (overlay, circular, white bg, orange icon) that step to prev/next banner and pause auto-advance briefly.
- Add dot indicators below the banner so users can jump to a specific banner.
- Keep auto-advance every ~4s (replacing the marquee), pause on hover or after manual interaction.
- Preserve the existing link-wrapping behaviour for banners with a `link`, the orange "Latest Results" badge, and the rounded white frame.

No other files touched. Backend, data, and other sections remain unchanged.
