## Goal

1. Change the "Open window" input from a number-of-minutes box into a **time input (HH:MM)**, with validation that it is strictly later than the test start time. Storage stays as `open_window_minutes` (computed = window_time − start_time, in minutes).
2. Make the test date display **DD/MM/YYYY everywhere** — admin and student — so both sides see the same format.

## 1. Open window — time input

**File:** `src/pages/CreateTestPage.tsx`

- Replace `openWindowMinutes: string` state with `openWindowTime: string` ("HH:MM", same day as `startDate`).
- On edit-prefill (~line 278): if `open_window_minutes` is set, compute `openWindowTime = formatHHMM(startsAt + minutes*60_000)`.
- In the 2×2 schedule grid (~line 1005), swap the minutes number input for `<input type="time">` labelled "Open window (entry closes at)".
- In `buildSchedulePayload` (~line 448): if `openWindowTime` is set and `startDate`+`startTime` are valid, build `Date(${startDate}T${openWindowTime}:00)` and compute `Math.round((windowMs − startMs)/60000)`. Only persist if `> 0`; otherwise set `open_window_minutes: null` and show an inline validation error.
- Block submit (and disable Save) when `openWindowTime` is set but `≤ startTime`, with the message "Open window time must be after the start time."
- Update the "Scheduled:" summary: show `· entry closes ${openWindowTime}` instead of `+N min`.

Scope: same-day window only (no overnight). Confirm if you need cross-midnight support — otherwise this is sufficient for JEE/NEET sittings.

## 2. DD/MM/YYYY everywhere

Add one shared helper `formatTestDateTime(iso)` in `src/lib/utils.ts` that returns `DD/MM/YYYY, HH:mm` (24h) and `formatTestDate(iso)` returning `DD/MM/YYYY`.

Replace ad-hoc `new Date(...).toLocaleString()` / `toLocaleDateString()` calls for test schedule rendering in:

- `src/pages/TestInstructionsPage.tsx` — header / countdown labels.
- `src/pages/CbtLiveTestsPage.tsx` — "Starts …" and "Closes …" labels (lines 125, 147).
- `src/pages/TestListPage.tsx` — list of upcoming/past tests.
- `src/pages/AdminTestsPage.tsx`, `src/pages/AdminTestDetailPage.tsx`, `src/pages/AdminTestsHubPage.tsx` — admin lists/detail showing test start/end.
- `src/pages/CreateTestPage.tsx` — the "Scheduled:" summary line.

The native `<input type="date">` in CreateTest stays ISO (`YYYY-MM-DD`) since that's required by the browser control — only the *displayed* schedule text changes.

## Out of scope

- No DB schema change (still `open_window_minutes integer`).
- No change to enforcement logic in `TestInstructionsPage.tsx` (still uses `startsAt + minutes*60_000`).
- No change to result/attempt pages' timestamp formats unless you want those swept too — say the word and I'll include them.
