## Root cause

The Student Result page calls the `get_test_result_bundle` RPC. That function is declared `STABLE`, so PostgREST runs it in a **read-only** transaction. Internally it calls `get_test_rank`, which — when the leaderboard cache is missing or older than 30s — calls `refresh_test_leaderboard` (INSERT/UPDATE into `test_leaderboard_cache`). That write blows up with:

```
25006: cannot execute INSERT in a read-only transaction
```

The RPC therefore returns an error, `bundle` is null in `TestResultPage.tsx`, and the UI renders **"Result not found."**

Confirmed from the actual failing network request on this route (attempt `fdc7a31e-...`, user Aditya Kumar Yadav — the legitimate owner). Auth is fine; the query is what's failing.

## Fix

Migration that changes the two RPCs to `VOLATILE` so PostgREST allows the leaderboard cache write:

- `public.get_test_result_bundle(uuid)` → `VOLATILE` (keep `SECURITY DEFINER`, `search_path=public`, body unchanged).
- `public.get_test_rank(uuid)` → `VOLATILE` for the same reason (it also transitively writes and is called directly from other pages).

No client changes needed — the `TestResultPage` logic already handles the returned bundle correctly.

## Verification

- Reload `/tests/:slug/result/:attemptId` for Aditya's attempt; expect the full scorecard, subject charts, and Scorecard/Solution PDF buttons instead of "Result not found".
- Confirm the rank panel populates once released (the leaderboard refresh will now succeed).
- Check network: the RPC call should return `200` with `{ attempt, test, subjects_max, rank }`.