## Goal

1. Add **"Join as teacher"** link in the footer → `/career`.
2. Add **"Already a teacher? Login"** button next to "Apply Now" on the Career hero → routes to `/teacher/dashboard` if user is logged in (and is a teacher), else to `/login` with a redirect back.
3. Build the **staff → teacher credential provisioning flow**: staff reviews an educator enquiry, generates temporary credentials from the admin panel, the teacher logs in with those credentials, and is forced to change the password on first login.

---

## Changes

### 1. Footer link (`src/components/PublicLayout.tsx`)
Add a new "Join as teacher" link under the **Company** column, right next to the existing "Join as mentor" link. Both point to `/career`.

### 2. Career hero CTA (`src/pages/CareerPage.tsx`)
Next to the "Apply Now" button (both in the top hero and the bottom final-CTA), add a secondary outline button:
- Label: **"Already a teacher? Login"** with `LogIn` icon.
- Behavior: Reads `user` and `role` from `useAppStore` / `AuthContext`.
  - If logged in **and** has `teacher` role → navigate to `/teacher/dashboard`.
  - Else → navigate to `/login?redirect=/teacher/dashboard`.
- `LoginPage` will read `?redirect=` and route there after a successful login.

### 3. Staff dashboard — generate credentials
In **`src/pages/AdminEducatorApplicationsPage.tsx`**, add a new **"Generate Login"** action button that appears for `approved` applications (and is visible in the detail dialog):

- Opens a small dialog showing the candidate's email, an auto-generated 12-char temp password (with a copy button + regenerate), and a "Create teacher account" submit button.
- Submitting calls a new edge function `provision-teacher` (admin-only) which:
  1. Creates the auth user (or updates password if already exists) with `email_confirm: true`.
  2. Inserts `user_roles` row with `role = 'teacher'`.
  3. Sets `app_metadata.must_change_password = true` so we can detect first-login.
  4. Upserts a `profiles` row with full_name + phone from the application.
  5. Marks the application status as `credentials_sent` and stores `credentials_sent_at`.
- Returns the email + temp password so the staff member can share them manually (call/WhatsApp).

### 4. Force password change on first login
- After login, `AuthContext` (or `LoginPage` post-success) checks `user.app_metadata.must_change_password`. If true, redirect to a new route **`/auth/change-password`**.
- New page **`src/pages/ForceChangePasswordPage.tsx`**: simple form (new password + confirm). On submit:
  1. `supabase.auth.updateUser({ password })`.
  2. Calls a tiny edge function `clear-password-flag` (service role) to unset `app_metadata.must_change_password`.
  3. Redirects teachers to `/teacher/dashboard`.
- Route is gated: only accessible when the flag is true. While the flag is set, all other protected routes redirect here.

### 5. Database migration
Add a new column to `educator_applications`:
- `credentials_sent_at TIMESTAMPTZ NULL`
- Extend the allowed status values to include `credentials_sent` (status is plain text today, no enum change needed).

### 6. Edge functions (auto-deployed)
- **`provision-teacher`** — admin-gated (verify caller has `staff`/`admin` role via JWT), creates/updates auth user, assigns `teacher` role, sets the must-change flag, updates the application record. `verify_jwt = true` (default).
- **`clear-password-flag`** — authenticated user clears their own `must_change_password` flag after a successful password update.

---

## Flow summary

```text
Public visitor
  └─ /career → fills enquiry (existing EducatorApplicationDialog)
        └─ Lands in admin → Educator Enquiries

Staff
  ├─ Calls candidate, marks "Approved"
  ├─ Clicks "Generate Login" → temp password shown + copied
  └─ Shares email + temp password with candidate manually

Teacher
  ├─ Footer "Join as teacher" or hero "Already a teacher? Login"
  ├─ /login (with staff-shared credentials)
  ├─ Detected must_change_password → /auth/change-password
  ├─ Sets new password → flag cleared
  └─ Lands on /teacher/dashboard
```

---

## Files to create
- `src/pages/ForceChangePasswordPage.tsx`
- `supabase/functions/provision-teacher/index.ts`
- `supabase/functions/clear-password-flag/index.ts`
- `supabase/migrations/<ts>_teacher_provisioning.sql`

## Files to edit
- `src/components/PublicLayout.tsx` (footer link)
- `src/pages/CareerPage.tsx` (hero + final CTA secondary button)
- `src/pages/AdminEducatorApplicationsPage.tsx` (Generate Login dialog)
- `src/pages/LoginPage.tsx` (honor `?redirect=` + must-change-password check)
- `src/context/AuthContext.tsx` (expose `must_change_password`, route guard)
- `src/App.tsx` (add `/auth/change-password` route)
