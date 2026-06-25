# Admin Panel UX Polish

## 1. Persistent layout + skeleton while switching tabs
The sidebar already lives in `AdminLayout` with `<Outlet />`, but the flash happens because each admin page fetches its own data on mount with no shared loading frame, and large pages re-mount their internals immediately. We will:

- Add `<Suspense fallback={<AdminPageSkeleton />}>` around the `<Outlet />` in `src/components/AdminLayout.tsx`.
- Convert the heavy admin routes in `src/App.tsx` (Users, Students, Courses, Tests Hub, Boost, Toppers, Books, Banners, etc.) to `React.lazy()` so route switches show the skeleton instead of a blank flash while the chunk and its initial query resolve.
- Create `src/components/admin/AdminPageSkeleton.tsx` — a reusable generic skeleton (header bar + filter row + table rows) using `@/components/ui/skeleton`. Drop it into each page's own `loading` state too (replacing the current ad-hoc spinners on Students/Users) so the same shimmer appears during data refetches.

## 2. Bansal logo on the sidebar
In `src/components/AdminLayout.tsx`, replace the flame icon + "Bansal Classes" text block at the top of `AdminSidebar` with the existing `BansalLogo` component (`src/components/bansal/BansalLogo.tsx`, which uses the `bansal-logo.webp` asset). Keep the "Super Admin Panel / Admin Panel" pill underneath.

## 3. Replace orange→purple gradient CTAs with navy
The gradient appears on the "Invite User" / "Add Student" style buttons. Swap the classes:

- `bg-gradient-to-r from-primary to-accent ... text-primary-foreground` → `bg-[#0F1729] text-white hover:bg-[#0F1729]/90`

Files to update:
- `src/pages/AdminUsersPage.tsx` (line 235 — Invite User CTA)
- `src/pages/AdminStudentsPage.tsx` (line 307 — Add Student CTA)

Avatar circles that use `from-primary/20 to-accent/20` are decorative (not the buttons the user flagged) and will be left alone.

## 4. Fix Students pagination
`src/pages/AdminStudentsPage.tsx` currently renders a custom one-page indicator (lines 531–552). Replace it with the shared `TablePagination` component already used by `AdminUsersPage`, passing `page + 1`, `totalPages`, `total`, `pageSize`, and an `onPageChange` that sets `page` back to 0-indexed. This gives the same `1, 2, 3, …` UI as the Users table.

## Files touched
- `src/components/AdminLayout.tsx` — Suspense + skeleton fallback, logo swap.
- `src/App.tsx` — lazy-load admin routes.
- `src/components/admin/AdminPageSkeleton.tsx` — new shared skeleton.
- `src/pages/AdminUsersPage.tsx` — navy Invite User button; use shared skeleton in loading state.
- `src/pages/AdminStudentsPage.tsx` — navy Add Student button, shared skeleton, replace pagination with `TablePagination`.
