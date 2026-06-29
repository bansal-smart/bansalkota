## Goal
Let the Centre Admin define custom roles for their staff (e.g. "Front Desk", "Counsellor"), pick which Centre Dashboard tabs each role can see, and choose per-tab permissions (View, Create, Edit, Delete, Export). When a staff member with such a role logs into the Centre Dashboard, the sidebar/tiles show only allowed tabs and disallowed actions are blocked.

## Scope of tabs (modules) that can be assigned
Mirrors the existing Centre sidebar:
Overview, Centre Detail, Page Banners, Centre Banner, Gallery, Online Courses, Centre Courses, Live Classes, Test Platform, Test Series, Website Enquiries, Course Enquiries, My Students, Support, Role Management (admin only — non-assignable).

Per-module actions (checkbox grid like reference image):
view, create, edit, delete, export. Modules that don't support an action just hide it.

## Data model (new tables in `public`)

1. `centre_roles`
   - centre_id (fk centres), name, description, is_system (bool), created_by, created_at, updated_at
   - unique(centre_id, name)

2. `centre_role_permissions`
   - role_id (fk centre_roles, on delete cascade)
   - module (text — e.g. "banners", "gallery", "students" …)
   - can_view, can_create, can_edit, can_delete, can_export (bool)
   - unique(role_id, module)

3. Extend `centre_staff` with `custom_role_id uuid` (nullable, fk centre_roles). Existing `role` text column stays as the coarse label (Admin / Manager / Supervisor / Executive). Only "Admin (Centre Level)" bypasses custom-role checks.

RLS: only users who are centre_staff with role = 'admin' for that centre (or super_admin) can insert/update/delete centre_roles + centre_role_permissions for that centre. All centre_staff of the centre can SELECT (to know their own perms). Add GRANTs accordingly.

## Frontend

### Sidebar
Add "Role Management" item in `src/components/CenterLayout.tsx` (visible only to centre admins — role === 'admin' or super_admin).

Route: `/center/roles` → new `CenterRolesPage.tsx`.

### CenterRolesPage.tsx
- Lists existing custom roles (cards/table) with member count, edit/delete actions.
- "Add Role" button opens `CenterRoleModal`.

### CenterRoleModal.tsx
- Step 1: name + description.
- Step 2: Permissions grid. Each module = row with parent checkbox (toggles all in that row) plus 5 action checkboxes (View/Create/Edit/Delete/Export). Layout matches the reference screenshot.
- Save → upserts role + permissions in a single transaction (rpc or sequential insert).

### Assign role to staff
Extend existing `CenterStaffModal.tsx`:
- After the existing 4 coarse role dropdown, show a "Custom Role" dropdown listing this centre's `centre_roles`. Optional — if blank, only coarse role applies.
- Persist on centre_staff.custom_role_id.

### Permission enforcement (client)
- New hook `useCenterPermissions()` returns `{ isAdmin, can(module, action) }`. Loads current user's `centre_staff` row + joined permissions.
- `CenterLayout` filters sidebar items by `can(module,'view')`. Admin always sees all.
- Each module page guards mutating buttons:
  - Hide/disable "Add", "Edit", "Delete", "Export" controls based on `can()`.
- Route-level guard in `ProtectedCenterRoute` redirects to /center if module not viewable.

### Server-side defence (light)
RLS on the existing centre tables already restricts by centre membership. Full per-action RLS using custom roles is out of scope for this iteration; we enforce in UI + the existing role checks. Document this in the modal footer ("Permissions hide UI; the centre admin remains accountable").

## Files to create
- `supabase/migrations/...` — tables, grants, RLS.
- `src/pages/CenterRolesPage.tsx`
- `src/components/CenterRoleModal.tsx`
- `src/hooks/useCenterPermissions.ts`
- Module key constants in `src/lib/centerModules.ts`

## Files to edit
- `src/components/CenterLayout.tsx` — add nav item, filter by permissions.
- `src/App.tsx` — register `/center/roles` route.
- `src/components/CenterStaffModal.tsx` — custom role dropdown.
- A handful of centre pages — hide create/edit/delete buttons via `useCenterPermissions`.

## Out of scope
- Editing built-in coarse roles (Admin/Manager/etc.).
- Per-record RLS based on custom role (UI-level enforcement only for now).
- Audit log of permission changes.
