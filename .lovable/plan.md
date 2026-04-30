## Student dashboard cleanup & nav rewiring

### 1. Hide scrollbars in the student layout
In `src/components/StudentLayout.tsx`, add the same scrollbar-hiding utilities already used in `TeacherLayout`:
- Sidebar `<aside>` (currently `overflow-y-auto`) → add `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`.
- Main content `<main>` (currently `overflow-y-auto`) → same utilities.

Scrolling still works; the visible scrollbar is suppressed across browsers.

### 2. Update the sidebar nav (`src/components/StudentLayout.tsx`)
- **Main → Browse Courses**: change `path` from `/courses` to `/explore-courses`.
- **Explore section**: remove the `Educators` entry (keep Compete, My Analytics, Leaderboard).
- **Account section**: remove the `Store` entry.
- **Mobile bottom nav**: remove the `Store` item; replace with `Browse` pointing to `/explore-courses` (so mobile users still have access).
- Drop the now-unused `Users` and `ShoppingBag` icon imports if no longer referenced (`ShoppingBag` is still used by mobile nav today, so re-check after edit).

### 3. Rewire routes (`src/App.tsx`)
- Add a new route inside the student-only protected block:
  `<Route path="/explore-courses" element={<StorePage />} />`
- Remove the standalone block that mounts `/store` under `StudentLayout`.
- Add a redirect for safety so any old links keep working:
  `<Route path="/store" element={<Navigate to="/explore-courses" replace />} />`

`StorePage` is moved (route-wise) but its component file stays untouched, so its content renders verbatim at the new URL.

### 4. Sweep stale `/store` links
Search and update any remaining in-app links to `/store` to point at `/explore-courses` (e.g. dashboard quick-action cards, if any). The redirect above is a safety net but direct fixes are cleaner.

### Out of scope
- The `useAppStore` Zustand store (path `@/store/useAppStore`) is unrelated to the `/store` route and stays as-is.
- `CoursesPage` (the public marketing `/courses` route) is untouched; it remains available to public visitors via `PublicLayout`.

### Files touched
- `src/components/StudentLayout.tsx` — nav arrays, scrollbar utilities, mobile nav.
- `src/App.tsx` — route changes for `/explore-courses` and `/store` redirect.
- Any student-facing component still linking to `/store` (sweep result).
