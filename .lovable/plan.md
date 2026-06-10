# Leadership Copy Polish + Course Page Cleanup

Three small, content-only edits on existing pages. No schema or logic changes.

## 1. Sameer Bansal — credential ribbon wording

File: `src/pages/LeadershipDetailPage.tsx` (the existing orange-on-navy ribbon, ~lines 312–325).

Rewrite the single line to read exactly:

> **Author of 4 best-selling JEE preparation books** · **Mentor of All India Rank 1 and single-digit ranks several times.**

Two-clause layout, orange emphasis on "4 best-selling JEE preparation books", "All India Rank 1", and "single-digit ranks". Keep the AwardIcon and surrounding ribbon styling untouched.

Also update the matching timeline entry in `src/content/bansal/leaderEditorial.ts` (the `Author` row) so the body copy reads: *"Author of 4 best-selling books for JEE preparation — Problems in Calculus, Algebra, Coordinate Geometry, and Trigonometry & Vectors."* — keeps wording consistent across ribbon, timeline, and the Books grid heading.

## 2. V.K. Bansal Sir — persistent identity line on his page

User wants the words **"V.K. Bansal Sir"** to always be visible on his profile page as a single dedicated line.

File: `src/pages/LeadershipDetailPage.tsx`, inside the `slug === "vk-bansal"` branch.

Add a slim navy ribbon directly below the hero (mirroring Sameer's ribbon pattern) containing one line:

> **Mr. V.K. Bansal Sir** — Founder, Bansal Classes · The Architect of Kota (since 1981)

- Sticky-feel placement: immediately after the hero band, before the gallery.
- Same `bg-bansal-blue text-white` ribbon style as Sameer's for visual symmetry.
- Single line on desktop; wraps cleanly on mobile.

This guarantees the "V.K. Bansal Sir" wording appears prominently on every visit to that page, regardless of which section the user scrolls to.

## 3. Course Detail page — Know Your Teachers

File: `src/pages/CourseDetailPage.tsx` line 342.

The section's JSX was already removed in a prior pass; only a placeholder comment remains. Delete the leftover `{/* Know Your Teachers — removed per product update */}` comment and the extra blank line so the file is clean.

## Out of scope

- No DB migrations, no route changes, no new assets.
- No edits to other leader profiles (Mahima / Neelam) or to course content blocks beyond the comment cleanup.
