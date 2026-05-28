## Add leader photos across About + Leadership pages

### Assets
Copy the 4 uploaded photos into `src/assets/leadership/`:
- `vk-bansal.jpg` (replaces the existing `vk-bansal-portrait.jpg` usage)
- `sameer-bansal.jpg`
- `mahima-bansal.jpg`
- `neelam-bansal.jpg`

### `src/content/bansal/about.ts`
Add a `photo` field to each entry in `leadership[]` pointing to the new asset imports (or expose a separate `leadershipPhotos` map keyed by slug).

### `src/pages/AboutPage.tsx`
- Swap the hero portrait import to the new `vk-bansal.jpg`.
- In the **Leadership** grid, replace the circular initials placeholder with the actual photo for each leader — keep card layout, but render a larger rounded portrait (e.g. `h-40 w-full object-cover rounded-xl` with `object-position: top`) so the full face/upper body shows nicely instead of a small circle.

### `src/pages/LeadershipDetailPage.tsx`
- Add a `photo` field to each profile (mapped to the new assets).
- Replace the hero's circular initials block with a **big editorial-style portrait**: a tall framed image on the left (`md:w-80 lg:w-96`, `aspect-[3/4]`, `rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl`), with the orange glow accent already used on the AboutPage VK hero. Name, role, tags stay on the right.
- Keep fallback to initials only if a profile has no photo.

### Out of scope
No copy changes, no new routes, no schema/data changes.
