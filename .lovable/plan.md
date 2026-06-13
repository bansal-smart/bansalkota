## Goal
Replace the per-test secret CBT link with one fixed kiosk URL (`/cbt`). Students log in with roll number + mobile, see all currently-live CBT tests assigned to their batch, and take them. Test creation gets a clean **Test Mode** selector (Digital web/app  OR  CBT — not both).

## 1. Schema changes (one migration)

`tests` table:
- Add `test_mode text not null default 'digital'` with check `in ('digital','cbt')`.
- Backfill `test_mode = 'cbt'` where `cbt_enabled = true`, else `'digital'`.
- Keep `cbt_allowed_batch_ids uuid[]` (drives batch gating).
- Drop / ignore `cbt_token` (no longer needed — single fixed URL). Keep the column for now, just stop using it; remove after a release.
- Replace `cbt_enabled` usage with `test_mode = 'cbt'`.

New RPCs (security-definer):
- `cbt_live_tests_for_batch(_batch_id uuid)` → returns id, title, description, duration_minutes, total_questions, total_marks, starts_at, ends_at for every test where `test_mode='cbt'`, `is_published=true`, `now() between starts_at and ends_at` (or `starts_at` null), and `(_batch_id = any(cbt_allowed_batch_ids) or cbt_allowed_batch_ids is null or array_length(cbt_allowed_batch_ids,1) is null)`.
- Keep `cbt_lookup_student(roll, phone)` as-is for the edge function.

## 2. Edge function

Rename concept: `cbt-login` now returns the **session only** (no specific test). The kiosk page asks for credentials → signs the student in → router loads the live-tests list filtered by their batch.

`cbt-login` payload now: `{ roll_number, phone }` (no token). It:
1. Looks up student by roll+phone (RPC).
2. Signs in via synthetic email + mobile password.
3. Returns `{ session, student: { user_id, full_name, batch_id, roll_number } }`.

## 3. Routes & pages

- `/cbt` (public) — Kiosk login page. Roll no + Mobile. On success → `/cbt/tests`.
- `/cbt/tests` (auth) — Lists live CBT tests for the student's batch. Each card → "Start Test" button → instructions screen → existing `TestTakingPage`.
- `/cbt/test/:testId` — Wrapper around the existing test taking UI but in "kiosk chrome": no LMS sidebar, header shows `CBT · {studentName} · Roll {regno}`, and on submit/auto-submit shows a brief "Submitted ✓ — results released by your centre" screen for ~5s, then `supabase.auth.signOut()` and `navigate('/cbt')`.
- Drop `/cbt/:token` route (replaced by `/cbt`).

Kiosk layout:
- Full-screen, no app shell, no nav, prevent accidental navigation back to LMS routes.
- `useSingleDeviceLogin` disabled inside `/cbt/*` so multiple students can use the same kiosk sequentially.

## 4. Admin test creation UI

In `CreateTestPage` (and `AdminTestDetailPage` summary):
- New **Test Mode** segmented control at the top of the form: **Digital (Web + App)** vs **CBT (Kiosk Only)**.
- When `CBT` is selected:
  - Show a multi-select of batches (`cbt_allowed_batch_ids`). Empty = all batches.
  - Show a read-only callout: "Students take this on the kiosk at `https://<site>/cbt` using roll no + mobile."
  - Hide LMS-only settings (e.g. "show in student LMS test list") if any.
- When `Digital` is selected:
  - Hide batch picker & kiosk callout.
  - Test appears in the normal LMS tests list as today.
- Replace `CbtSettingsPanel` (per-test token/link UI) with the new mode toggle + batch picker. Remove "Copy link" / "Regenerate" buttons.

## 5. LMS visibility rule

`useTests` (and any student-facing test list) excludes `test_mode = 'cbt'` tests so kiosk-only tests don't leak into the logged-in LMS test list. Admin lists still show everything with a "CBT" badge.

## 6. Cleanup
- Remove `CbtSettingsPanel` token UI; replace with simple "Allowed batches" panel shown only when mode = CBT.
- Update `cbtRoster.json` flow / Admin Batches page text to reference the single `/cbt` URL.
- Keep `cbt_token` column for one release for safety; no code reads it.

## Technical notes

- Single-test-attempt rule per (student × test) already enforced — re-entry resumes existing attempt until timer ends (good for kiosk-sequential use, since the *same* student returning will resume; a *different* student logging in starts their own attempt).
- After signOut on the kiosk, Supabase client clears local storage so the next student sees a clean login.
- `test_mode` check constraint keeps the two modes mutually exclusive at the DB level, matching the "Either/Or" UX.
- Existing `TestTakingPage` UI is reused verbatim inside the kiosk wrapper — same timer, palette, submit flow, marking — only the chrome and post-submit behavior differ.

## Files to add / edit

Add:
- `src/pages/CbtKioskLoginPage.tsx` (replaces `CbtLoginPage` content for `/cbt`)
- `src/pages/CbtLiveTestsPage.tsx` (`/cbt/tests`)
- `src/pages/CbtTestTakingPage.tsx` (kiosk wrapper around the test UI)
- New migration: `test_mode` column + `cbt_live_tests_for_batch` RPC + backfill.

Edit:
- `supabase/functions/cbt-login/index.ts` — drop token, return session only.
- `src/App.tsx` — new `/cbt`, `/cbt/tests`, `/cbt/test/:id` public routes; remove `/cbt/:token`.
- `src/pages/CreateTestPage.tsx` and `src/pages/AdminTestDetailPage.tsx` — add Test Mode selector, swap CBT panel.
- `src/components/admin/CbtSettingsPanel.tsx` — simplify to "Allowed batches" picker (no token UI).
- `src/hooks/useTests.ts` — filter out `test_mode='cbt'`.
- `src/pages/AdminBatchesPage.tsx` — show the single kiosk URL prominently.

## Open question
Should I also add a kiosk-mode CSS guard (disable right-click, F11 fullscreen prompt, block keyboard shortcuts like Ctrl+T/Ctrl+W)? Useful for true lab kiosks but can be added in a follow-up. Defaulting to **no** unless you say otherwise.
