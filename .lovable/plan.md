
## 1. Data wipe (clean slate)

Run a one-time cleanup migration:
- Delete all rows from `question_bank`, `test_questions`, `tests`, `test_attempts`, `test_reattempt_requests`, `question_import_batches`.
- Delete all existing **student** auth users (only users whose `user_roles.role = 'student'` and who are NOT also admin/super_admin/teacher/center_admin), plus their `profiles`, `enrollments`, `lesson_progress`, `study_sessions`, `doubts`, `notifications`.
- Admin / teacher / center_admin accounts are preserved.

## 2. New "Batches" feature

A course (Bulls Eye JEE, Sterling JEE, Nucleus JEE…) holds multiple batches (J1/J2, V1/V2, A1/A2…).

New table `course_batches`:
- `course_id` (FK → courses)
- `code` (e.g. `XI-J1`) and `name`
- `class_level` (`XI` / `XII` / `XIII`)
- `center_id` (FK → centers, optional)
- `is_active`

`profiles` gets `batch_id uuid` (FK → course_batches).

Admin UI:
- In Admin → Courses → course detail: new **Batches** tab to create/edit/list batches.
- In Admin → Students: show batch column, allow re-assigning batch.

## 3. Bulk import 84 Kota students from the uploaded Excel

Parse `st_data_1.xlsx` (2 sheets, 84 rows):
- Bulls Eye JEE → 5 batches: `XI-J1` (13), `XI-J2` (4), `XI-P*` (5), `XI-P1` (8), `XI-P2` (22)
- Sterling JEE → 2 batches: `XIII-V1` (23), `XIII-V2` (9)

Migration / one-off edge function will:
1. Find or create Kota center (link `centers` row).
2. Create courses **Bulls Eye JEE** and **Sterling JEE** if missing (offline / center-tagged).
3. Create the 7 batches above under the right course.
4. For each student row create an auth user:
   - **email** = `<RegNo>@cbt.bansal.local` (synthetic; only used internally for auth)
   - **password** = `CONTACTNO` (mobile number, string)
   - profile: `full_name`, `phone = CONTACTNO`, `dob`, `center_id = Kota`, `batch_id`, `target_exam = 'JEE'`, `class_level` (`XI` or `XIII`), `is_bansal_offline_student = true`
   - extra column `roll_number` on `profiles` = RegNo (indexed, unique).
   - Role: `student`.
   - Auto-enroll in the matching course.

## 4. CBT mode (secret-link exam)

Same test-taking UI, but no LMS login required.

**Per test settings (new columns on `tests`):**
- `cbt_enabled boolean default false`
- `cbt_token text unique` (random 32-char slug, generated when enabled)
- `cbt_allowed_batch_ids uuid[]` — which batches can sit this CBT (optional; empty = all imported students)

**Public route:** `/cbt/:token`

Flow:
1. Student opens the secret link (admin shares it).
2. Page shows: test title, instructions, **Roll Number** + **Mobile Number** inputs.
3. Submit calls a new edge function `cbt-login`:
   - Looks up `profiles` by `roll_number`, verifies `phone == mobile entered`, verifies batch is allowed for this CBT.
   - Signs the student in by calling `signInWithPassword` on the server using their synthetic email + mobile-as-password and returns the session to the browser.
4. Browser sets the Supabase session → redirected to a CBT-specific test-taking page that reuses the existing `TestTakingPage` UI (same palette, same timer, same submit flow), but:
   - Header shows "CBT Mode · {test title} · Roll {regno}"
   - On submit/auto-submit → CBT-specific result screen ("Submitted. Results released by your centre.") and the session is signed out (so the secret link can't become an LMS backdoor).
5. One active attempt per (student × CBT test); re-entry resumes the same attempt until time runs out.

**Admin UI changes (Test detail page → new "CBT" tab):**
- Toggle "Enable CBT mode" → generates/copies the secret URL.
- Multi-select batches allowed.
- Button **Copy CBT link** and **Regenerate token**.
- Live list of CBT attempts (roll no, batch, status, score once released).

## 5. Cleanup of stale paths
- Remove the "Mentor"/"Compete" references already deprecated where they touch test pages (only if they collide with CBT routes).
- Keep existing LMS test flow unchanged for students who DO log in.

---

## Technical notes (for the implementing pass)

- New tables/columns done in one migration with GRANTs + RLS:
  - `course_batches` (admins manage; students can read their own batch).
  - `profiles.batch_id`, `profiles.roll_number` (unique, nullable).
  - `tests.cbt_enabled`, `tests.cbt_token`, `tests.cbt_allowed_batch_ids`.
- Edge functions:
  - `bulk-import-cbt-students` — runs the Excel-derived payload (admins only, service role).
  - `cbt-login` — service-role lookup by roll_number+phone, returns session via `auth.admin.generateLink` + `signInWithPassword` server-side; response includes `access_token` / `refresh_token` so the client can `supabase.auth.setSession(...)`.
- Public route `/cbt/:token` added in `App.tsx`, outside any `ProtectedRoute`.
- CBT result page does `supabase.auth.signOut()` on unmount to prevent lingering sessions on shared lab machines.
- Single-device login (`useSingleDeviceLogin`) will be disabled inside the CBT route so multiple students can use the same browser sequentially.

## Defaults I'm assuming (tell me if any are wrong)

1. Synthetic emails use the `@cbt.bansal.local` suffix; students never see/use them.
2. Mobile number is stored as-is (10-digit string) and is used as their password.
3. Only the 7 batches present in the Excel are created now (Nucleus A1/A2 will be added when you give the data).
4. All 84 students are tagged to a single **Kota** center; if one doesn't exist, I'll create it.
5. CBT secret link is per-test (one link covers all allowed batches). Switch to per-batch links later if you prefer.
