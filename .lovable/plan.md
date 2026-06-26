
## Root cause

Looking at the PRPSMS template screenshot you shared:

| Field | Value |
|---|---|
| Type | Transactional |
| Body | `Dear Applicant, {#var#} is your verification code for Online Application at Bansal Classes. Team Bansal` |
| Sender ID | **20190332** |
| Status | Approved |
| Template name | **CodeRed** |

The approved sender ID for this template is `20190332`, **not** `VBANSL`. Earlier I changed the default sender to `VBANSL` based on your instruction, but the DLT-approved binding for the `CodeRed` template is to sender `20190332`. When PRPSMS receives the SMS with a sender ID that doesn't match the template's DLT binding, the operator silently drops it — exactly what you're seeing (PRPSMS returns a "sent" msg id, but the SMS never reaches the phone).

## Plan

Single small change — revert the default sender and confirm the template+sender combination is what's registered.

### 1. `supabase/functions/_shared/prpsms.ts`
- Change `PRPSMS_SENDER_DEFAULT` from `"VBANSL"` back to `"20190332"`.
- (Template body for `CodeRed` is already correct and matches the screenshot exactly.)

### 2. Verify after deploy
- Trigger an OTP from the login page.
- Confirm in `sms_send_log` that the row records `template_name: "CodeRed"` and a `provider_msg_id`.
- The SMS should land on the phone within seconds since the sender+template now match the DLT-approved binding.

### Notes
- If you later want a branded alpha sender like `VBANSL`, that sender ID has to be approved on the PRPSMS portal **and** the `CodeRed` template re-bound to it. Until then, `20190332` is the only sender that will actually deliver this template.
- No other code changes needed — `prpsms-send-otp`, `prpsms-verify-otp`, and the LoginPage flow are already correctly wired.
