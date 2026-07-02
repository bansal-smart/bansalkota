# Plan: Restore real OTP SMS on Login via PRPSMS

## Goal
Remove the static-OTP bypass and send real OTPs through the PRPSMS HTTP API using the exact working format the user confirmed.

## Working reference (confirmed by user)
```
GET http://164.52.195.161/API/SendMsg.aspx
  ?uname=20190320
  &pass=Bansal@1234
  &send=VBNSAL
  &dest=9352443837
  &msg=Dear Applicant, 1122 is your verification code for Online Application at Bansal Classes. Team Bansal
```

Key differences from what's currently stored:
- `uname` → `20190320` (currently a different value in `PRPSMS_UNAME`)
- `pass` → `Bansal@1234`
- `send` (sender ID) → `VBNSAL` (currently `20190332` default)
- No `priority` / `schtm` params in the working call — keep the call minimal

## Changes

### 1. Update PRPSMS credentials (secrets)
Update three existing secrets to the confirmed working values:
- `PRPSMS_UNAME` = `20190320`
- `PRPSMS_PASS` = `Bansal@1234`
- `PRPSMS_SENDER` = `VBNSAL`

This will use `update_secret` (opens a secure form; the user re-enters/confirms).

### 2. `supabase/functions/_shared/prpsms.ts`
- Simplify `prpsmsSend` to match the working URL exactly: only `uname`, `pass`, `send`, `dest`, `msg` (drop `priority`, drop `schtm` unless explicitly passed).
- Update the default sender constant `PRPSMS_SENDER_DEFAULT` to `VBNSAL`.
- Keep `renderTemplate`, `toDestNumber`, `toE164`, response parsing, `prpsmsBalance` unchanged — they already work for the shared use-case (result SMS, etc.).

### 3. `supabase/functions/prpsms-send-otp/index.ts`
Remove the static bypass block and restore real send:
- Generate a random 6-digit OTP (`Math.floor(100000 + Math.random()*900000)`).
- Render via `renderTemplate("CodeRed", { otp })` → produces the exact "Dear Applicant, {otp} is your verification code..." wording that matches the DLT-approved template used in the working curl.
- Call `prpsmsSend({ to: dest, body })`.
- On failure: log to `sms_send_log` with `status: "failed"` and error, return 502 with a user-safe message.
- On success: hash OTP with `sha256Hex(`${e164}:${purpose}:${otp}`)`, insert into `phone_otps` with 10-min expiry, log to `sms_send_log` with `status: "sent"` and `provider_msg_id`.
- Re-enable the existing per-phone/per-IP rate limit (currently commented out) to prevent abuse: max 5 sends per phone per hour.

### 4. `prpsms-verify-otp` (companion function)
Currently accepts `123456` unconditionally as part of the bypass. Remove that shortcut so only the real hashed OTP validates. (If exploration shows it doesn't have that shortcut, skip.)

### 5. Login page
No change needed — `src/pages/LoginPage.tsx` already calls `prpsms-send-otp` with `{ phone, purpose: "login" }`. The restored function will just start returning real OTPs to the user's phone.

## Verification
1. After deploy, POST to `prpsms-send-otp` with the user's real number via `supabase--curl_edge_functions`.
2. Confirm response is `{ ok: true, expires_at }` (no `static_bypass` flag).
3. Check `sms_send_log` row shows `status: "sent"` with a `provider_msg_id`.
4. Confirm user receives the SMS and can verify via `prpsms-verify-otp`.
5. Check `supabase--edge_function_logs` for the outbound URL in case of failure.

## Rollback
If PRPSMS returns errors, re-enable the static bypass block (kept in git history) while credentials/DLT are re-checked.
