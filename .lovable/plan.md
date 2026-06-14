## Goal

For any scheduled test (e.g. 9:00 AM), it should be **visible** in the CBT/test list at all times (even hours before), but the **Start** action should activate only **1 minute before** the scheduled time. Before that, show a live countdown; after `ends_at`, show closed.

## Scope of Changes

### 1. CBT kiosk RPC — `public.cbt_live_tests_for_batch`
Currently filters out tests where `now() < starts_at`, so future tests are hidden. Update to:
- Drop the `now() >= starts_at` condition (keep `ends_at` check).
- Return everything published + batch-eligible, including upcoming ones.
- Order by `starts_at` ascending (upcoming first).

New migration to `CREATE OR REPLACE FUNCTION` with the relaxed WHERE clause.

### 2. CBT kiosk list — `src/pages/CbtLiveTestsPage.tsx`
- Show every test returned by the RPC.
- Add a per-card live status using `starts_at`:
  - `now < starts_at − 60s` → "Starts at HH:MM · opens in mm:ss", Start button **disabled**.
  - `starts_at − 60s ≤ now ≤ ends_at` → Start button **enabled** ("Active now").
  - `now > ends_at` → "Closed", disabled.
- Lightweight 1-second ticker (single `setInterval`) to update countdowns/state.

### 3. Test instructions gate — `src/pages/TestInstructionsPage.tsx`
- Change `notYetOpen` from `now < startsAt` to `now < startsAt − 60_000` so the page also opens the Start button 1 minute early.
- Countdown label updates to "Starts in" and disappears at T-1 min.

### 4. Live tests widget — `src/components/LiveTestsWidget.tsx`
- Apply the same T-1 min rule: a test counts as "live/active" once `now ≥ starts_at − 60_000` (instead of `≥ starts_at`). Upcoming-bucket logic stays for tests further than 1 min away.

## Out of Scope
- No changes to scheduling UI in `CreateTestPage` (creation flow already supports `starts_at`/`ends_at`).
- No changes to attempt/submission logic — only the gate to enter.
- Auto-submit on `ends_at` continues to be handled by existing test runner.

## Technical Notes
- Activation window constant: `const ACTIVATION_LEAD_MS = 60_000;` defined once per file.
- RPC change is backward compatible (same return signature).
- All countdowns computed client-side from `Date.now()` vs `starts_at`.
