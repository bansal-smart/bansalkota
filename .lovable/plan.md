
# PRPSMS Integration Plan (with DLT-approved templates)

Wire PRPSMS into the platform for OTP, transactional SMS, admin broadcast, and balance widget — using the approved templates already registered on PRPSMS account `20190332`.

## 1. Template mapping (from your Manage Template list)

All sends use the exact approved wording, only `{#var#}` slots are filled at runtime. Variables are positional — order matters.

| Use case | Template name | Variables (in order) |
|---|---|---|
| OTP — signup / login / password reset / sensitive action | **PaymentGateway_OTP** | `{otp_code}` |
| OTP — fallback / alt | CodeRed | `{otp_code}` |
| Enrollment confirmation (after payment) | **Payment Confirmation-1** | `{name}`, `{test_date}`, `{time_slot}` |
| Result + rank declaration | **Result** | `{name}`, `{test_name}`, `{date}`, `{score}`, `{rank}` (matches `Dear {#var#}, Result of Test {#var#} dated {#var#} {#var#} {#var#}`) |
| Registration / welcome | **Registration1** | `{name_or_intro}`, `{institute}`, `{course}`, `{cta_visit}`, `{cta_call}` |
| Login credentials (post-enrollment) | **Login_URL** / **Login Credential-1** | per template |
| Roll no + password | Roll_pwd | `{name}`, `{roll}`, `{password}`, `{date}`, `{timing}` |
| Test reminder (day before / day of) | Reminder Message 1 / 2 | `{date}`, `{time}` |
| Test submission acknowledgement | Test Submission | `{name}`, `{result_date}`, `{by_time}` |
| Parent — absent | Absent_prnt | `{date}` |
| Parent — info (gate punch) | Information New | `{name}`, `{date}`, `{time}` |
| Generic broadcast (admin tool) | uses Registration1 / Reminder / etc. (admin picks from approved templates only) | per template |
| Cancel/ignore previous | ignore | none |

A small server-side template registry (`sms_templates.ts`) holds the canonical text + variable schema for each template name, so callers pass `{ template: 'PaymentGateway_OTP', vars: { otp: '123456' } }` and the registry renders the final body that PRPSMS expects.

**Admin broadcast is restricted to approved templates** — admins can't send free-form text (DLT compliance). They pick a template, fill variables, choose audience, send.

## 2. Secrets

Request via secrets tool:
- `PRPSMS_UNAME` — account username
- `PRPSMS_PASS` — account password
- `PRPSMS_SENDER` — defaulted to `20190332`

All PRPSMS API calls happen server-side only.

## 3. Database (new tables)

- `phone_otps` — `phone`, `otp_hash` (sha256), `purpose` (`signup`|`login`|`password_reset`|`sensitive_action`), `attempts`, `expires_at`, `verified_at`, `ip`. Service-role only.
- `phone_verifications` — `user_id` ↔ verified `phone` + `verified_at`. Gates sensitive actions.
- `sms_send_log` — `to_phone`, `template_name`, `vars` (jsonb), `rendered_body`, `purpose`, `provider_msg_id`, `status`, `error_code`, `sent_by`, `created_at`. Admin/super_admin readable.
- `sms_broadcasts` — `template_name`, `vars_defaults` (jsonb), `audience_filter` (jsonb: role/course/centre/batch), `total_recipients`, `sent_count`, `failed_count`, `status`, `created_by`, timestamps.
- `sms_broadcast_recipients` — per-recipient row tied to a broadcast (`phone`, `vars` jsonb, `status`, `provider_msg_id`, `error_code`).
- Add `phone_e164 TEXT` and `phone_verified BOOLEAN DEFAULT false` to `profiles`.

Each table gets explicit GRANTs + RLS policies per platform rules.

## 4. Edge Functions

All under `supabase/functions/`, with Zod validation, CORS, and structured JSON errors.

- `prpsms-send-otp` — `{ phone, purpose }`. Generates 6-digit OTP, stores SHA-256 hash (5-min TTL), rate-limited (1/60s, 5/hour/phone, 20/hour/IP), renders **PaymentGateway_OTP** with the OTP, calls PRPSMS `SendMsg.aspx`, logs to `sms_send_log`.
- `prpsms-verify-otp` — `{ phone, otp, purpose }`. Verifies hash, max 5 attempts.
  - `signup` → returns short-lived verification token consumed by account creation
  - `login` → mints a session via admin auth (`createUser` if new, else issue session) and returns it
  - `password_reset` → returns a reset token used by the reset endpoint
  - `sensitive_action` → writes a `phone_verifications` row valid 10 min
- `prpsms-send-transactional` — internal helper; service-role only. Inputs `{ template_name, vars, to_phone, purpose, idempotency_key }`. Used by payment webhooks, result-release, etc.
- `prpsms-broadcast` — admin/super_admin only. Expands audience filter, queues rows into `sms_broadcast_recipients`, processes in chunks (~50/sec), updates counters.
- `prpsms-balance` — calls `BalAlert.aspx`, parses plain-text response, caches 5 min, admin-only.

PRPSMS returns either a 19-char message ID (success) or an error code/message — parsed into structured JSON.

## 5. Triggers for transactional sends

- **Cashfree / Stripe payment success webhook** → invoke `prpsms-send-transactional` with `Payment Confirmation-1`.
- **Result release** (the action that flips `tests`/`test_series` to results-released and warms `test_leaderboard_cache`) → enqueue per-student sends using `Result` template (score + rank). Throttled batch.
- **Account creation after phone OTP** → optionally send `Registration1`.
- **Test reminders** → pg_cron job 24h + 1h before `live_classes`/`tests` start → `Reminder Message 1` / `Reminder Message 2`.

## 6. Frontend flows

- **Signup (phone verify):** Phone step → Send OTP → 6-digit input → Verify → continue to account creation.
- **Login via phone + OTP:** New tab on login screen — mobile + OTP, session returned by `prpsms-verify-otp`.
- **Password reset via OTP:** Option alongside email reset on forgot-password screen.
- **Sensitive actions:** Reusable `<PhoneOtpGuard>` modal used before changing password / email / phone in profile settings.
- **Admin broadcast tool** (`/admin/sms-broadcasts`):
  - Step 1: pick approved template from dropdown (live preview of rendered text)
  - Step 2: fill variables (defaults + per-recipient overrides where applicable)
  - Step 3: pick audience (role / course / centre / batch)
  - Recipient preview count
  - Send now / schedule (via `schtm`)
  - History table with status, sent/failed counts, per-recipient drilldown
- **Balance widget** in Admin Command Centre: card showing current balance, last-fetched time, refresh button, red warning when balance < threshold (default 500).

## 7. Security / abuse controls

- OTPs SHA-256 hashed, never stored plain
- 5-min expiry, max 5 attempts, 60s resend cooldown, 5/hour/phone, 20/hour/IP
- PRPSMS credentials only in edge function env
- Broadcast endpoint role-gated (admin + super_admin)
- Phones normalized to E.164; PRPSMS `dest` gets 10-digit local form
- Free-form SMS is disallowed in UI — only approved templates can be sent

## 8. Out of scope

- New DLT template registration (use existing approved list above)
- Two-way SMS replies
- WhatsApp fallback

---

### Technical notes

- PRPSMS uses GET with query params, returns plain text. Use `URLSearchParams` + `fetch`. Treat any non-19-char-ID response as an error and log raw body.
- `dest` expects 10-digit Indian mobile; strip `+91` / leading `0` before sending; store full E.164 internally.
- For phone-login session minting, use Supabase admin API (`createUser` if new, then issue a session). The verify function returns session JSON the client sets on the supabase client.
- Balance response is plain text — regex parse, surface raw text on error.
- Template renderer replaces `{#var#}` left-to-right with the variable array; reject sends where variable count doesn't match.
