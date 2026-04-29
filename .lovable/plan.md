## Problem

The app currently only distinguishes "staff/admin" vs "everyone else (treated as student)". Teachers (`user_roles.role = 'teacher'`) are treated as students:

- After login, teachers are sent to `/dashboard` (student portal) instead of `/teacher/dashboard`.
- `/teacher/*` routes are wrapped in `ProtectedStudentRoute`, which only checks "logged in & not staff" — a real student could visit `/teacher/dashboard`.
- `/dashboard` (student) is reachable by teachers because the guard never checks for a teacher role.

Your account `lakshaysaxena2217@gmail.com` has `role = 'teacher'` in the database — confirmed via query — so the data is correct; only the frontend role logic is wrong.

## Fix

### 1. Track the teacher role in `AuthContext`

Extend `AuthContext` to resolve and expose all three roles per session:

- `isStudent`, `isTeacher`, `isStaff` (staff covers admin)
- `role: 'student' | 'teacher' | 'staff' | 'admin' | null`
- Keep `roleReady` flag (already exists) to gate guards/redirects until the server check resolves.

The role check uses the existing `has_role` SECURITY DEFINER RPC for `teacher`, `staff`, `admin`. Defaults to `student` when none match.

### 2. Add a generic `ProtectedRoute`

Create `src/components/ProtectedRoute.tsx` that accepts `allow={['teacher']}` (or `'student'`, `'staff'`).

Behaviour:
- While `loading || !roleReady` → show centered spinner.
- No session → redirect to `/login` (or `/admin/login` for staff routes), preserving destination.
- Logged in but role not in `allow` → redirect to that user's correct home (`/teacher/dashboard`, `/dashboard`, or `/admin/dashboard`), so they're never stuck on `/access-denied` for honest mistakes.

Refactor existing `ProtectedStudentRoute` and `ProtectedAdminRoute` to thin wrappers around `ProtectedRoute` so behaviour stays consistent.

### 3. Wire `/teacher/*` routes to a teacher guard

In `App.tsx`, swap `ProtectedStudentRoute` → `ProtectedRoute allow={['teacher']}` for the teacher block. Similarly tighten `/dashboard` and other student-only routes to `allow={['student']}` so teachers can't accidentally land there.

### 4. Fix the post-login redirect in `LoginPage`

Currently:
```
if (isStaff) → /admin/dashboard
else         → /dashboard
```

Change to:
```
if (isStaff)        → /admin/dashboard
else if (isTeacher) → /teacher/dashboard
else                → /dashboard
```

Same logic applied wherever else a default landing route is computed (e.g. `Index.tsx` if it auto-redirects).

### 5. Self-heal current session

You're already signed in, so once the new role check ships, your session will pick up `isTeacher = true` on next page load and you'll be redirected to `/teacher/dashboard` from `/login` and from any student-only page.

## Files Touched

- `src/context/AuthContext.tsx` — add teacher detection + expose `isTeacher`, `isStudent`, `role`.
- `src/components/ProtectedRoute.tsx` — new generic role-based guard.
- `src/components/ProtectedStudentRoute.tsx` — refactor to delegate to `ProtectedRoute`.
- `src/components/ProtectedAdminRoute.tsx` — refactor to delegate to `ProtectedRoute`.
- `src/App.tsx` — apply correct `allow` lists to teacher and student route blocks.
- `src/pages/LoginPage.tsx` — branch redirect on `isTeacher`.
- `src/pages/Index.tsx` — same branching if it auto-redirects.

## Out of Scope

- Changing database roles or RLS — already correct.
- Touching admin login flow — already protected and working.
- UI redesign of `/access-denied` — keep as the fallback for hard mismatches (e.g. signed-out users hitting `/teacher/*`).
