# Tab Switch / Window Close Warning During Test

Add anti-cheat tab-switch detection on the test taking screen (`src/pages/TestTakingPage.tsx`).

## Behavior

- Detect when the student leaves the test window:
  - Switches browser tab (page becomes hidden via `visibilitychange`)
  - Minimizes window / switches app (window `blur`)
  - Tries to close/refresh tab (`beforeunload` — counted as a violation when they come back)
- On every return to the test, show a **closable warning dialog** (shadcn AlertDialog) with the current violation count.

## Warning thresholds

| Violation # | Message                                                                                       | Action            |
| ----------- | --------------------------------------------------------------------------------------------- | ----------------- |
| 1           | "You switched or closed the tab 1 time. Do not do this — you have 1 more chance."             | Show dialog, allow Continue |
| 2           | "Final warning! You switched tabs 2 times. One more violation will auto-submit your test."    | Show dialog, allow Continue |
| 3           | "You have been blocked. Your test is being submitted automatically."                          | Auto-submit attempt and redirect to result page |

## Implementation details

1. **State**: `tabSwitchCount` (number), `showWarning` (bool) in `TestTakingPage`.
2. **Listeners** (registered only while attempt is in-progress):
   - `document.addEventListener("visibilitychange", ...)` — increment when `document.hidden`.
   - `window.addEventListener("blur", ...)` — increment (debounced 500ms to avoid double-counting with visibilitychange).
   - Show dialog on next `focus` / `visibilitychange → visible`.
3. **Persistence**: Store `tabSwitchCount` in `test_attempts.metadata.tab_switches` via a lightweight update on each violation so refresh-then-rejoin cannot reset the counter. Existing `submit_test_attempt` RPC already merges metadata — no schema change required, just an `update` on `test_attempts` from the client (RLS already allows the owner to update their own in-progress attempt).
4. **Auto-submit on 3rd violation**: Call the same `handleSubmit` / `submit_test_attempt` flow already used by the "Submit Test" button, then navigate to the result page. Toast message: "Test auto-submitted due to repeated tab switching."
5. **Dialog UI**: shadcn `AlertDialog` with an orange/red warning icon, the message above, and a single "I understand, continue" button (Continue hidden on 3rd violation since auto-submit happens).
6. **Edge cases**:
   - Don't count tab switches before the test actually starts or after submission.
   - Don't count if dialog is already open (prevent re-increment while the user is dismissing).
   - Cleanup listeners on unmount.

## Files

- **Edit**: `src/pages/TestTakingPage.tsx` — add hook, listeners, AlertDialog, auto-submit branch.

No database migration required.
