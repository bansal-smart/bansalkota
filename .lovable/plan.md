## CBT Password-Based Login System

### 1. Database (migration)
- Add `cbt_password_hash text` and `cbt_password_set_at timestamptz` columns to `profiles`.
- New RPC `cbt_login_with_password(_roll text, _password text)` — SECURITY DEFINER, uses `pgcrypto` (`crypt`/`gen_salt('bf')`) to verify hashed password. Returns `user_id` on match.
- New RPC `admin_set_cbt_password(_user_id uuid, _password text)` — restricted to admin/super_admin/center_admin; hashes and stores.
- New RPC `student_change_cbt_password(_old text, _new text)` — auth.uid()-scoped; verifies old, stores new hash.
- New RPC `admin_bulk_generate_cbt_passwords(_user_ids uuid[], _overwrite boolean)` — hashes random 8-char alphanumeric passwords for each; returns `[{user_id, roll_number, full_name, password}]` (plaintext returned ONCE for CSV download, never stored).

### 2. Edge function
- Update `supabase/functions/cbt-login/index.ts`: accept `{roll_number, password}` instead of phone. Call `cbt_login_with_password` RPC. Continue to mint Supabase session via existing email + phone-password fallback? → Replace: use admin API `generateLink` or `signInWithPassword` using the auth user's stored password. Simplest: keep auth password = same student password. So `admin_set_cbt_password` will also update `auth.users.password` via a service-role call from a new edge function `admin-set-cbt-password` (RPC alone can't touch auth). Same for bulk + student-change → route through edge functions:
  - `admin-set-cbt-password` (single reset, admin only)
  - `admin-bulk-cbt-passwords` (bulk generate, returns CSV data)
  - `student-change-cbt-password` (auth.uid())
- Each edge function: verify caller role, generate/accept password, `supabase.auth.admin.updateUserById(user_id, { password })`, mirror hash into `profiles.cbt_password_hash` for RPC-based login verification, and update `cbt_password_set_at`.

### 3. Frontend — /cbt login (`CbtLoginPage.tsx`)
- Replace "Mobile Number" field with "Password" field (text/password, show/hide toggle).
- Submit calls `cbt-login` with `{roll_number, password}`.
- Add "Forgot password? Contact your centre" helper text.

### 4. Admin Students page (`AdminStudentsPage.tsx`)
- New toolbar buttons next to existing actions:
  - **Generate CBT Passwords** (bulk): opens dialog — pick "Selected students" or "All filtered students", toggle "Overwrite existing passwords". Calls `admin-bulk-cbt-passwords`, receives list, auto-downloads CSV (`roll_number, full_name, batch, centre, password`) via existing `exportCsv` helper. Shows one-time in-modal table too.
  - **Reset Password** row action (per student): dialog to enter or auto-generate new password, shown once with copy button.
- Row column indicator: "CBT password set" badge based on `cbt_password_set_at`.

### 5. Student dashboard — password change
- New card/section on Settings page (`SettingsPage.tsx`) "CBT Test Password": current + new + confirm, calls `student-change-cbt-password`. Success toast.

### 6. Security
- Random passwords: 8 chars, alphanumeric excluding ambiguous (0/O/I/l/1), generated in edge function using `crypto.getRandomValues`.
- Plaintext passwords returned only in the immediate response for admin CSV; never persisted.
- Rate-limit login attempts via existing pattern (best-effort, not blocking).

### Files touched
- Migration (schema + RPCs + grants)
- `supabase/functions/cbt-login/index.ts` (replace phone with password)
- New: `supabase/functions/admin-set-cbt-password/index.ts`, `admin-bulk-cbt-passwords/index.ts`, `student-change-cbt-password/index.ts`
- `src/pages/CbtLoginPage.tsx`
- `src/pages/AdminStudentsPage.tsx` (+ small dialog components)
- `src/pages/SettingsPage.tsx` (password-change card)

No forced-change on first login. Admin-set passwords are visible/copyable once by admin.