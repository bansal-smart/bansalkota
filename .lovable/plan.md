A single coordinated rollout for the 12 items from your note. I'll group them so related changes ship together.

## Group A — Marketing & Content (frontend only)

1. **Highlight Kota Centre on landing.**
   - Add `is_featured` boolean + `featured_rank` int to `centers` table (default false). Migration + GRANT/RLS keep as-is.
   - Update `components/landing/CentresShowcase.tsx` to sort featured-first and render a "Flagship — Kota" ribbon on the featured card. Admin can toggle via `AdminCentersPage`.

2. **Sameer Sir About page — strengthen credentials.**
   - Edit `src/content/bansal/leaderEditorial.ts` for Sameer to include the line: *"Mentor of All India Rank 1 and single-digit ranks several times; Author of 4 best-selling books for JEE preparation."*
   - Add a "Books by Sameer Sir" section on `LeadershipDetailPage` (4 book cards with cover + title + buy/learn-more link). Covers will be AI-generated placeholders until you upload real ones.

3. **V.K. Bansal Sir continuity on Sameer's page.**
   - Add a "In continuation of V.K. Bansal Sir's legacy" footer block on Sameer's About page linking to V.K. Bansal Sir's leadership profile with portrait + 1-line bio.

4. **Remove "Know Your Teachers" from Course pages.**
   - Delete the block at `CourseDetailPage.tsx` line ~348 and the `FALLBACK_TEACHERS` constant.

5. **Bansal Alumni page (new).**
   - New route `/alumni` with hero + alumni grid (reusing existing `toppers` table; filter `is_alumni=true` if we add the column, otherwise show all toppers categorized by year).
   - Migration: add `is_alumni boolean default true`, `current_role text`, `company text`, `batch_year int` to `toppers`.
   - Add nav link in main header.

6. **Faculty photos — Mahima Ma'am & Neelam Ma'am.**
   - Generate stylized AI portraits (kept consistent with existing Bansal/Sameer styling) as Lovable Assets. Real photos can replace them later by overwriting the asset pointers.

## Group B — Test Platform

7. **Topic / Sub-topic tabs in the Online Test Paper platform.**
   - Migration: add `topic text`, `sub_topic text` to `test_questions`. Allow null for backward compatibility.
   - In `AdminTestDetailPage` / question editor: add Topic + Sub-topic inputs.
   - In `TestTakingPage`: subject tabs already exist; add a second-level pill row showing Topics in current subject, and a third-level Sub-topic dropdown to jump to questions.

8. **Partial marking for MCQ-multi only.**
   - The DB function `submit_test_attempt` already supports `partial_marking` for `mcq-multi` (JEE-Advanced style: +1 per correct chosen, 0 if none wrong & not exact). Confirm it's enabled by default for new `mcq-multi` questions: migration sets `partial_marking default true` on `test_questions` and the import pipeline marks multi-correct as partial.
   - Admin UI toggle remains; single-MCQ stays all-or-nothing.

9. **Re-attempt by admin approval (Online Test).**
   - New table `test_reattempt_requests` (student_id, test_id, attempt_id, reason, status: pending/approved/rejected, decided_by, decided_at).
   - Student UI on `TestResultPage`: "Request Re-attempt" button → submits request.
   - Admin page `AdminTestAttemptsPage`: pending requests panel; on approval, the existing locked attempt is marked `reattempt_approved` and student can start a fresh attempt for that test (RLS check via new helper `can_reattempt_test(user, test)`).

## Group C — Auth & Session

10. **Single-device login (kick old session).**
    - New table `active_sessions (user_id PK, session_id text, device_label text, last_seen)`.
    - On login, client writes a fresh session_id (uuid in localStorage) and updates the row. A Supabase Realtime channel `auth-session:{user_id}` broadcasts the new session_id.
    - Other tabs/devices listening see a different session_id → auto sign-out + toast "Signed in on another device".
    - Works alongside existing Google + email login.

## Group D — Post-submission UX

11. **Post-submission thank-you messages.**
    - Centralize in `src/content/postSubmissionMessages.ts`:
      - Enquiry/CTA forms → warm "Our counsellor will reach you within 24 hours" with WhatsApp/Phone CTA.
      - Welcome popup → already shows thanks; align tone.
      - Payments/Enrollment success → "Welcome to Bansal Classes — your journey to AIR begins now" with next-step links (Dashboard, Live Classes, Test Series).

12. **Wire web enquiries to Admin Panel** — already complete (Landing CTA filter + label live in AdminEnquiriesPage). No further work needed; included here only for confirmation.

## Technical Notes

- Migrations needed (in order):
  1. `centers.is_featured`, `centers.featured_rank`
  2. `toppers` alumni columns
  3. `test_questions.topic`, `test_questions.sub_topic`, default `partial_marking=true` for mcq-multi inserts
  4. `test_reattempt_requests` table + helper function + RLS + GRANTs
  5. `active_sessions` table + RLS + GRANTs + realtime publication
- New routes: `/alumni`. Updated routes: leadership detail (books + V.K. Bansal block), course detail (remove teachers), test taking (topic tabs), test result (request re-attempt), admin attempts (approve re-attempt), admin centers (feature toggle).
- No new third-party packages.

## Out of scope (will not touch)

- Real photos of Bansal Sir, Sameer Sir, Mahima Ma'am, Neelam Ma'am — using existing + AI placeholders. Swap-in is a 30-second asset replacement when you share them.
- Payment provider changes; payments thank-you copy only.

Approve and I'll execute groups A → D in that order.
