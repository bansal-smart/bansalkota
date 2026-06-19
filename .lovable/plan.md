## Audit Summary

I scanned the codebase (37.5K LOC), the Supabase schema (70 tables, 295 RLS policies, 93 indexes), the linter, and the live `pg_stat_statements`. Here's what I found and the prioritized fixes.

### Headline findings
- **App.tsx ships every page in the initial bundle** — 153 routes, 136 top-level imports, zero `React.lazy`. First paint is dragging the entire admin/teacher/center surface to every visitor, including logged-out homepage users.
- **Test autosave hammers the DB** — `UPDATE public.test_attempts` ran **31,046 times** for ~90s of total DB time (top slow query). Saves the entire `answers` + `metadata` + `question_statuses` JSONB blob on a short interval.
- **31 MB of unoptimized PNGs in `src/assets`** — single PNGs at 2 MB+ (`bansal-legacy-banner.png`, `stream-neet.png`, `boost-logo.png`, etc.). Only 15 files use the CDN asset pipeline; 96 raw images still live in the repo.
- **RLS policies use bare `auth.uid()`** in 549 places. Supabase officially recommends `(select auth.uid())` so the planner evaluates it once per query instead of per row — significant on big tables (test_attempts, lesson_progress, notifications).
- **109 linter warnings**, dominated by `SECURITY DEFINER` functions still executable by `anon`/`authenticated`, two public buckets that allow listing, and a few `USING (true)` write policies.
- **387 `any`/`as any` casts** and **17 stray `console.log/warn/error`** in production code.

---

## Prioritized Fix Plan

### P0 — UX-critical perf (do first)

**1. Route-level code splitting in `src/App.tsx`**
Convert every page import to `React.lazy(() => import("./pages/X"))` and wrap `<Routes>` in a single `<Suspense fallback={<Spinner/>}>`. Keep `LandingPage`, `LoginPage`, `SignupPage`, and the public layout eager so the marketing path stays instant. Expected impact: initial JS payload down by an estimated 60–75% for first-time visitors.

**2. Throttle/debounce test autosave (top slow query)**
In `TestTakingPage.tsx`, the autosave currently fires on nearly every interaction.
- Debounce to 5s and skip the write when nothing changed since last save (deep-equal answers+statuses).
- Stop sending `metadata` on every save — only when its content actually changes (warnings, tab switches).
- Add a single composite index `CREATE INDEX IF NOT EXISTS idx_test_attempts_user_test_status ON public.test_attempts(user_id, test_id, status);` to back the dashboard queries.

**3. Image optimization pass**
- Migrate the 96 raw PNGs/JPEGs in `src/assets` and `public/` to the Lovable asset CDN via `lovable-assets create`. Convert source PNGs >300 KB to optimized WebP/AVIF (squoosh) before upload.
- Add `loading="lazy"` and `decoding="async"` to the ~32 `<img>` tags that don't have it (27/59 currently do).
- Add `fetchpriority="high"` + `<link rel="preload">` to the single hero image on `LandingPage.tsx`.
- Replace inline `<img>` for icons with `lucide-react` where already imported (audit `LandingPage.tsx`, `AboutPage.tsx`).

### P1 — Database perf & accuracy

**4. Rewrite RLS to wrap `auth.uid()`**
Generate one migration that re-creates the hot-table policies using `(select auth.uid())` and `(select public.has_role(...))`. Target tables (highest read volume): `test_attempts`, `lesson_progress`, `notifications`, `enrollments`, `doubts`, `live_class_attendance`, `test_questions`, `course_resources`. Other tables can follow in a second pass.

**5. Resolve linter findings**
- Revoke `EXECUTE … FROM anon, authenticated` on every `SECURITY DEFINER` function not meant for direct client calls (the linter lists ~100 of these; most are internal helpers).
- Tighten the 2 public storage buckets so `SELECT` on `storage.objects` requires `auth.role() = 'authenticated'` (or scope the path).
- Replace remaining `USING (true)` write policies with role-scoped checks.

**6. Reduce SELECT * usage**
14 hot reads in `src/hooks` and `src/pages` use `.select("*")`. Switch to explicit column lists for `useSiteContent`, `useTestSeries`, `useBooks`, `AdminBooksPage`, `AdminLeadershipPage`, `LiveClassRoomPage`, `TeacherLiveClassRoomPage` — cuts payload and avoids accidentally shipping new sensitive columns later.

### P2 — Code quality & "clumsy code" cleanup

**7. Centralize data fetching with React Query**
Only 6 files use `useQuery`/`useMutation`; the rest do `useEffect` + raw `supabase.from(...)` (~143 files). Wrap the top 20 reads (Admin dashboards, course pages, test list, notifications) in `useQuery` so we get caching, dedup, and request cancellation for free. This also kills the "flicker on every navigation" UX issue.

**8. Strip `any` types from public surfaces**
387 `any`/`as any` occurrences. Focus on shared modules first: `src/hooks/*`, `src/lib/docxImport/*`, `src/store/*`, and the test-platform pages. Generate proper types from `supabase/types.ts` (already auto-generated).

**9. Remove production `console.*` calls**
17 stray logs. Either gate behind `import.meta.env.DEV` or remove. Add an ESLint rule `no-console: ["warn", { allow: ["error"] }]` to prevent regressions.

**10. Split mega-pages**
Files marked for refactor (single-file > 700 LOC, hard to maintain):
- `TestTakingPage.tsx` (1440) → extract `<QuestionPalette>`, `<NumericKeypad>`, `<SupportQueryModal>`, `<AntiCheatBanner>`.
- `CreateTestPage.tsx` (1301) → extract `<TestMetaForm>`, `<QuestionPicker>`, `<SectionEditor>`.
- `AdminCourseContentPage.tsx` (1134), `AdminTestResultPage.tsx` (1016), `AdminLiveClassesPage.tsx` (957), `LandingPage.tsx` (748), `CourseDetailPage.tsx` (687).

### P3 — Polish

**11. SEO & metadata**
Verify every public route sets `<title>`, meta description (<160 chars), one `h1`, canonical, OG/Twitter tags. Add JSON-LD `Course` / `Organization` schema on `CoursesPage` and the landing.

**12. Build-time image format pipeline**
Add `vite-imagetools` so source images become AVIF/WebP at build time with a JPEG fallback via `<picture>`. Apply to the four landing hero images.

**13. Edge cases & observability**
- Add an error boundary around `<Suspense>` so a chunk-load failure (after deploys) shows "Refresh to update" instead of a white screen.
- Enable a lightweight web-vitals reporter (LCP/INP/CLS) to `console` in dev and the existing analytics in prod, so we can verify each P0/P1 fix improves the right number.

---

## Suggested rollout

```text
PR 1  P0 #1, #3 (lazy routes + image CDN/lazy attrs)         -> biggest UX win
PR 2  P0 #2 + P1 #4 (autosave throttle + RLS rewrite hot 8)  -> biggest DB win
PR 3  P1 #5, #6 (linter cleanup + select * → columns)        -> security/perf
PR 4  P2 #7, #8, #9, #10 incrementally per area              -> maintainability
PR 5  P3 #11, #12, #13                                       -> polish
```

## Technical notes (for engineers)

- React 18 + Vite 5 + Tailwind v3, React Query 5 already installed.
- Bundle inspection: after splitting, run `vite build && du -sh dist/assets/*.js | sort -h` to confirm landing-route chunk < 250 KB gzip.
- RLS rewrite pattern:
  ```sql
  DROP POLICY "students manage own attempts" ON public.test_attempts;
  CREATE POLICY "students manage own attempts" ON public.test_attempts
    FOR ALL TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));
  ```
- Autosave guard:
  ```ts
  const lastSavedRef = useRef<string>("");
  const payload = JSON.stringify({ answers, statuses, time });
  if (payload === lastSavedRef.current) return;
  lastSavedRef.current = payload;
  ```
- Asset CDN command (per image):
  ```bash
  lovable-assets create --file src/assets/bansal-legacy-banner.png \
    --filename bansal-legacy-banner.webp \
    > src/assets/bansal-legacy-banner.webp.asset.json
  ```

## Out of scope (won't touch unless asked)
- Visual redesign — purely performance/correctness/cleanup.
- Business logic of scoring / partial marking — already verified correct in the previous turn.
- Adding new features.

Tell me which PR to start with (or "all in order") and I'll switch to build mode.