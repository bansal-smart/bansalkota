## Goal

Three connected changes:

1. **Move static public content into the admin panel** so anything that may change over time is editable without code.
2. **Redesign the live-test result screen** with rich (standard-depth) analytics and **auto-release rank/comparison** once the test's scheduled `ends_at` passes.
3. **Surface scheduled live tests on the Student Dashboard** with a full "Tests" section (upcoming + live now + recent results).

---

## 1. Admin-editable public content

Today `site_banners`, `centers`, `toppers` are already admin-driven. The remaining hardcoded items live in:

- `LandingPage.tsx` → `testimonials[]`, `achievements[]` (stats counters)
- `AboutPage.tsx` + `LeadershipDetailPage.tsx` → hardcoded `profiles{}` (VK / Sameer / Mahima / Neelam) with photo, headline, quote, story sections, recognition

### New tables (admin-managed, public-read)

- `site_testimonials` — name, role/exam, quote, avatar_url, rating, region, sort_order, is_active
- `site_stats` — key, label, value, suffix, icon, sort_order, is_active (powers the homepage counter strip)
- `leadership_profiles` — slug, name, title, hero_photo_url, headline, pull_quote, intro, recognition_text, sort_order, is_active
- `leadership_sections` — leadership_id (fk), number, heading, body, sort_order (the numbered editorial blocks)

All four: GRANT to `authenticated` + `service_role`, GRANT `SELECT` to `anon` (public read), RLS = admins write, everyone reads when `is_active`. Seeded via migration with the current values so nothing visually regresses.

### New admin pages (under `/admin`)

- `AdminTestimonialsPage.tsx`
- `AdminStatsPage.tsx`
- `AdminLeadershipPage.tsx` (list + per-leader editor with sections repeater + photo upload to `site-content` bucket)

Add nav entries in the admin sidebar. Public pages refactored to fetch from these tables (with a small fallback to keep SSR-less first paint clean). Centres/Toppers/Banners pages already exist — no change.

---

## 2. Live-test result redesign + auto rank release

### Schema

- Add `results_released_at timestamptz` and `auto_release boolean default true` on `tests`.
- Add a SECURITY DEFINER function `public.get_test_rank(_attempt_id uuid)` returning `{rank, total, percentile, topper_score, avg_score, your_score}` — only returns data when `now() >= tests.ends_at` (or test has no `ends_at`, i.e. always-on practice → immediate).
- Add view/RPC `public.test_results_released(_test_id)` → boolean helper used by UI gating.

No cron needed: release is computed on read by comparing `now()` to `ends_at`. (Cheap, correct, and works for "anytime later" replay.)

### Result screen (`TestResultPage.tsx` — rewrite)

Two-state UI driven by `results_released`:

**Phase A — immediately on submit (score-only card)**
- Big score / total marks
- Correct / Wrong / Unattempted chips
- Accuracy %, time taken, avg time per question
- "Rank & comparison will unlock at HH:MM" banner with live countdown to `ends_at`
- Buttons: Review answers (if allowed), Back to tests

**Phase B — after `ends_at` (full report, also shown on any later visit)**
- Header: score, percentile, **rank / total attempts**, time, accuracy
- **Subject-wise analysis** table: attempted, correct, accuracy %, score, avg time
- **Charts** (recharts, already in stack):
  - Pie: Correct / Wrong / Unattempted
  - Bar: subject-wise score vs max
  - Horizontal bar: subject accuracy %
  - Comparison strip: Your score vs Topper vs Average
- Question-level review link (uses existing `get_test_question_answers` RPC)
- Download/share buttons reuse existing patterns

Reachable from **My Tests → past attempts** at any time; gating is purely by `ends_at`, so re-visits always show the full report once released.

### Realtime

Subscribe `TestResultPage` to `tests` row changes so if admin overrides `ends_at` or `is_published`, the screen flips Phase A → B without reload.

---

## 3. Dashboard "Live Tests" section

New component `UpcomingTestsSection.tsx` on `StudentDashboard.tsx`, above existing widgets. Three groups in one card:

- **Live now** — tests where `now() BETWEEN starts_at AND ends_at` and student matches target_exam → red "Live" pill, "Enter test" CTA
- **Upcoming** — next 5 by `starts_at` → countdown, "Set reminder" (writes to `notification_preferences` if available, else local), "View instructions"
- **Recent results** — last 3 submitted attempts → score chip, "View report" (deep-links to result page; Phase A or B auto)

Pulls from `tests` + `test_attempts` with a single query each, filtered client-side by exam/target. Realtime subscribed to both tables.

---

## Out of scope

- Advanced analytics (difficulty curve, peer band, PDF export) — you chose Standard.
- Admin override of rank release — auto-only.
- Editing footer / SEO / contact — not requested in this round.
- Touching course/test creation flows already shipped.

## Technical notes

- All new tables follow the 4-step migration order (CREATE → GRANT → ENABLE RLS → POLICY).
- Charts: `recharts` (already a dep).
- Countdown: lightweight `useCountdown` hook, no new dep.
- Photo uploads: existing `site-content` bucket.
- All copy/colors stay on the navy + orange tokens; Mulish/Plus Jakarta fonts; Lucide icons only.
