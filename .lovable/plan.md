## Migration Plan: Lovable Cloud → Personal Supabase

**Target project:** `ebkcnepzzvpbyrnroxjh.supabase.co`
**Scope:** Schema + table data + edge functions. **No** auth users, **no** storage files, **no** cutover of the live app.

---

### Phase 1 — Schema export (this project → SQL bundle)

1. Generate a single consolidated SQL file `migration/01_schema.sql` containing, in order:
   - Extensions used (`pgcrypto`, `pgmq`, etc.)
   - Enums (`app_role`, etc.)
   - All ~95 `public` tables with full column definitions
   - All sequences (e.g. `boost_admit_seq`)
   - All ~60+ functions (`has_role`, `score_test_attempt`, `admin_test_result_sheet`, scoring, notification triggers, etc.)
   - All triggers
   - All `GRANT` statements (anon / authenticated / service_role per the project's pattern)
   - All RLS `ENABLE` + `CREATE POLICY` statements
   - Storage bucket *definitions* only (no objects) — so signed-URL code paths don't break

2. Skip everything in `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas — those are managed.

3. You run `01_schema.sql` in your new project's SQL editor (or via psql). I'll include a verification query at the end that counts tables/functions.

---

### Phase 2 — Data export (per-table CSV)

1. I'll script CSV exports for every public table that has data, written to `/mnt/documents/migration/data/<table>.csv` using the project's `COPY ... TO STDOUT` access.

2. Tables that reference `auth.users(id)` (profiles, enrollments, user_roles, test_attempts, etc.) will be exported **with their user_id columns intact**. They will fail to import until those auth users exist — so on the new project I'll generate `02_data.sql` that:
   - Drops FK constraints to `auth.users` temporarily,
   - `\copy`s each CSV in,
   - Re-adds the FKs as `NOT VALID` (so existing orphan rows don't block; new inserts still validate).

3. Skipped tables (regenerated at runtime / sensitive / ephemeral):
   `active_sessions`, `phone_otps`, `phone_verifications`, `email_send_log`, `email_send_state`, `sms_send_log`, `test_leaderboard_cache`, `test_attempt_answer_snapshots` (optional), `study_sessions` (optional). You can override this list.

4. Output: a zip at `/mnt/documents/migration/bansal-data-export.zip` you download and import.

---

### Phase 3 — Edge functions redeploy script

1. Generate `migration/deploy-functions.sh` that loops every directory in `supabase/functions/` and runs:
   ```
   supabase functions deploy <name> --project-ref ebkcnepzzvpbyrnroxjh --no-verify-jwt
   ```
   (with per-function `verify_jwt` overrides matching the current `config.toml`).

2. Generate `migration/secrets-checklist.md` listing every secret currently used by these functions (PRPSMS_*, CASHFREE_*, RESEND_*, LOVABLE_API_KEY, etc.) so you set them in your new project's Edge Function secrets before deploying.

3. You run the script locally with `supabase login` + your access token. I won't have your service role token in the sandbox so I can't execute it for you.

---

### Phase 4 — Frontend rewire instructions (NOT applied)

Since you chose "just copy the data — don't touch the app," I will only **document** the env changes needed if you later want to cut over:

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `src/integrations/supabase/types.ts` regen via `supabase gen types`
- Image/PDF URLs in DB still point at `zmkgboiqubtowmionplq.supabase.co` storage (you chose to keep storage on old project — they'll keep working as long as the old project lives).

I will **not** edit `.env` or the generated client now.

---

### Deliverables you'll get in `/mnt/documents/migration/`

```
01_schema.sql              ~consolidated DDL
02_data.sql                wrapper that \copy's all CSVs with FK toggles
data/*.csv                 one per public table
deploy-functions.sh        edge function deploy loop
secrets-checklist.md       env vars to set in the new project
README.md                  step-by-step run order
bansal-data-export.zip     everything above, zipped
```

---

### What's explicitly NOT in scope

- Auth users (you skipped) — every login on the new project will fail until you re-create users.
- Storage objects — file URLs continue to resolve against `zmkgboiqubtowmionplq` until that project is deleted.
- Switching the live app over — `.env` stays pointed at Lovable Cloud.
- Cron / scheduled function setup on the new project (I'll list them in README; you wire them up).

Approve to switch into build mode and I'll generate the bundle.