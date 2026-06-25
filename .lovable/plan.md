## BOOST settings — admin-managed dates & price

Add a singleton settings row that powers the BOOST CTA on the landing page, the /boost page hero, and the registration modal. Manage it from a new "Settings" tab inside Admin → BOOST Registrations.

### Data
New table `public.boost_settings` (singleton, one row enforced by a fixed id):
- `exam_dates` — `date[]` (ordered list, e.g. `{2026-07-05, 2026-07-12}`)
- `price_inr` — `integer` (default 99)
- `apply_deadline_time` — `time` (default `18:00`) — used to build the apply-before cutoff
- `apply_deadline_days_before` — `smallint` (default 1)
- standard `created_at`/`updated_at`

RLS:
- public read (anon + authenticated) so the landing page and /boost can render without auth
- write restricted to `admin` / `super_admin` via `has_role`
- GRANTs added in the same migration

Seed one row with `{2026-07-05, 2026-07-12}`, price 99, 18:00, 1 day before.

### Derived values (client-side, in a shared hook)
`useBoostSettings()` returns:
- `examDates: Date[]` (sorted)
- `priceInr: number`
- `nextExamDate: Date | null` — first date `>= today`
- `applyBefore: Date | null` — `nextExamDate - applyDeadlineDaysBefore` at `apply_deadline_time` (IST)
- formatted strings for chips ("5 July 2026") and apply-before ("Apply before 4 July 2026, 6:00 PM")

### UI changes
1. **Landing BOOST section** (`src/pages/LandingPage.tsx` ~line 586–608)
   - Replace hard-coded `["5 July 2026", "12 July 2026"]` chips with `examDates` from the hook.
   - Replace `₹99` with `₹{priceInr}`.
   - Replace "Apply before 4 July 2026, 6:00 PM" with the computed `applyBefore` string. Hide the line if no upcoming date.

2. **/boost hero** (`src/pages/BoostPage.tsx`)
   - Subheading: replace static `₹99` with dynamic price.
   - Stats grid: "Reg. Fee" tile uses dynamic price.
   - Add a date strip below the CTA buttons rendering all `examDates` as chips, with the `nextExamDate` chip highlighted (orange background + ring). Show "Apply before …" line beneath.
   - "Is BOOST really only ₹99?" FAQ answer: interpolate price.

3. **Registration modal** (`src/components/BoostRegistrationModal.tsx`)
   - "Just ₹99 to reserve…" header line and "Registration fee: ₹99" use dynamic price.
   - `amount` sent on insert uses dynamic price (no other schema changes).

4. **Admin BOOST page** (`src/pages/AdminBoostPage.tsx`)
   - Add a "Settings" panel at the top (collapsible card) above the stats grid:
     - Price (₹) input
     - Apply-deadline time picker (default 18:00) + days-before number input (default 1)
     - Editable list of exam dates: each row is a date input with a remove button; "Add date" button appends a new row
     - Save button persists the row via an update on `boost_settings`
   - Read uses anon-readable row; write uses authenticated admin session.

### Technical notes
- Singleton enforced by a constant primary key (`id uuid primary key default 'a0000000-0000-0000-0000-0000000b0057'`) and seeded in the migration; admin UI always updates that id.
- Date formatting uses existing `Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })` pattern; time uses `h:mm a`. All comparisons done in Asia/Kolkata via a small helper to avoid TZ drift.
- No changes to `boost_registrations` table, edge functions, emails, or routing.

### Files touched
- New migration: `boost_settings` table + GRANTs + RLS + seed
- New: `src/hooks/useBoostSettings.ts`
- Edit: `src/pages/LandingPage.tsx`, `src/pages/BoostPage.tsx`, `src/components/BoostRegistrationModal.tsx`, `src/pages/AdminBoostPage.tsx`
