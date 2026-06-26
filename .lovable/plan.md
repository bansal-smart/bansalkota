## Goal
When a student is created by the admin, logging in with their mobile + OTP should land them directly on the dashboard — no name/profile prompt.

## Root causes
1. **Admin "Add Student" doesn't set `profiles.phone_e164`.** The bulk-import edge function (used by Add Student modal) only writes `profiles.phone` as the raw 10-digit string. The OTP login (`prpsms-verify-otp`, purpose=`login`) looks up the existing user by `profiles.phone_e164 = +91XXXXXXXXXX` — that lookup fails, so it falls into the "create new user" branch and provisions a brand-new auth account with empty metadata.
2. **`auth.users.phone` is never populated for admin-created students**, so the secondary `listUsers` fallback in the verify function also misses them.
3. **LoginPage forces the "name" step** whenever `user.user_metadata.full_name` is missing — it never checks the `profiles` table, so even if we matched the right user, an admin-created account (which has profile data but no auth metadata) still gets the name prompt.

## Fix

### 1. `supabase/functions/bulk-import/index.ts` (students branch)
- When normalizing/writing the student payload, also compute and set:
  - `phone_e164` = `+91` + 10-digit phone (when phone is a valid Indian mobile)
  - `parent_phone_e164` similarly (if a column exists; otherwise skip)
  - `phone_verified: true` (admin vouched for it)
  - `onboarding_completed: true`
- When the auth user is freshly created, also populate `user_metadata.full_name` (already done) and call `auth.admin.updateUserById` to set `phone` on the auth user so the secondary lookup also succeeds.

### 2. `supabase/functions/prpsms-verify-otp/index.ts` (purpose = "login")
Broaden the "find existing user" lookup before falling through to create-user:
- Try `profiles.phone_e164 = e164` (current).
- Then try `profiles.phone` matching either `e164` or the bare 10-digit form.
- Then the existing `auth.admin.listUsers` phone scan.
Only create a brand-new user if all of those miss. When we match by `phone` but `phone_e164` is null, backfill it so future lookups are O(1).

### 3. `src/pages/LoginPage.tsx`
Replace the `user_metadata.full_name` check with a `profiles.full_name` check:
- After session settles, fetch `profiles.full_name, onboarding_completed` for `user.id`.
- If `full_name` is present (admin-created students always have this), skip the "name" step entirely and route straight to `/dashboard`.
- Only show the name step for true first-time phone signups with no profile name.

### 4. One-time backfill migration
For existing admin-created students who are already broken:
- Update `profiles` set `phone_e164 = '+91' || phone` where `phone_e164 is null` and `phone ~ '^[6-9][0-9]{9}$'`.
- Same for any stored `parent_phone` if applicable.

## Out of scope
- No UI changes to the Add Student modal — it already collects everything we need.
- No changes to email-based admin/teacher login flows.
- CBT roll-number login (`cbt-login`) is unaffected.
