## Goal
Wire up real PRPSMS-based OTP login/signup for students using the approved `CodeRed` template and sender ID `VBANSL`, replacing the current `PaymentGateway_OTP` flow and dev bypass.

## Changes

### 1. PRPSMS sender ID
- Update `PRPSMS_SENDER_DEFAULT` in `supabase/functions/_shared/prpsms.ts` from `20190332` → `VBANSL`.
- Keep `PRPSMS_SENDER` env override support (so production can still override without a redeploy).

### 2. OTP template switch
- In `supabase/functions/prpsms-send-otp/index.ts`, switch the rendered template from `PaymentGateway_OTP` to `CodeRed` (same single `{otp}` variable, same body text — DLT-approved under the new sender).
- Update the `sms_send_log` insert to record `template_name: "CodeRed"`.
- Keep the existing 1/min and 5/hour rate-limits and the 5-minute expiry.

### 3. Remove dev OTP bypass
- In `supabase/functions/prpsms-verify-otp/index.ts`, remove the `STATIC_OTP = "123456"` shortcut so only real OTPs verify. Fix the existing bug where the `signup` branch references `record` outside the verification block by moving the `record` lookup to function scope.

### 4. Student signup via phone OTP
- Add a `Sign up` tab/toggle on `src/pages/LoginPage.tsx` (or a new `SignupPage` if cleaner) that:
  1. Collects phone → calls `prpsms-send-otp` with `purpose: "signup"`.
  2. Collects OTP + minimal profile (full name, class, target exam) → calls `prpsms-verify-otp` with `purpose: "signup"` to get a `verification_token`.
  3. Calls a new edge function `prpsms-create-student` (service-role) that:
     - Validates the `verification_token` against the latest verified `phone_otps` row for that phone.
     - Creates the auth user (placeholder email `phone-<10digit>@phone.bansalkota.local`, `email_confirm: true`).
     - Inserts/updates `profiles` with `phone_e164`, `phone_verified: true`, `onboarding_completed: true`, `full_name`, `class_level`, `target_exam`, role = student.
     - Returns `{ user_id, email, token_hash }` (magic link) so the client can sign the user in immediately, same pattern as the login branch.
- Login tab keeps the existing OTP flow (already calls `prpsms-verify-otp` with `purpose: "login"` and exchanges the magic link).

### 5. Config
- Confirm `prpsms-send-otp`, `prpsms-verify-otp`, and the new `prpsms-create-student` are callable anonymously (verify_jwt = false) in `supabase/config.toml`.
- Required secrets already configured: `PRPSMS_UNAME`, `PRPSMS_PASS`. Optional: `PRPSMS_SENDER` (defaults to `VBANSL` after this change).

### 6. Verification
- Send a real OTP to a test number, confirm SMS arrives with `CodeRed` wording from `VBANSL`.
- Confirm wrong OTP → "Incorrect OTP", correct OTP → student lands on dashboard with `onboarding_completed = true`.
- Confirm existing admin-created students can still log in (phone fallback lookup in verify is preserved).

## Open question
Do you want a separate **Sign Up** form for brand-new students (collecting name/class/exam during signup), or should the login screen auto-create a bare student record on first OTP and push them through onboarding afterwards (current behaviour for unknown phones)?
