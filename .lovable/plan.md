## Goal

Ship a single, conversion-optimized landing page at `/new` whose every section is content-editable from the Admin Command Centre. Used for crash courses, scholarship tests, admission campaigns, etc. — admin swaps text/images/dates/FAQs and runs ads at it. Leads land in a database table + admin inbox.

---

## URL & access

- Public page: `/new` (no auth, indexable, fast).
- Admin editor: `/admin/landing-page` (admin + super_admin only).
- Admin lead inbox: `/admin/landing-leads` (table view, filters, CSV export).

---

## Page sections (all fixed, all editable)

1. **Hero**
   - Background banner image (upload)
   - Course/event name (H1)
   - Key benefit one-liner
   - Start date pill
   - "Limited seats: N left" badge (toggle + number)
   - "Early bird ends in" countdown (toggle + deadline datetime)
   - Primary CTA → scrolls to form
   - Sticky lead form on the right (desktop) / below hero (mobile)

2. **Lead capture form** (also sticky on scroll, mobile bottom bar)
   - Fields: Full name, Phone, Email, Class/Target exam (select), City (optional), Message (optional)
   - Admin can toggle which optional fields show and edit the submit button label + success message
   - Client-side zod validation + duplicate-phone guard (24h window)

3. **Program Overview** — rich-text block (admin editable)

4. **Key Highlights** — repeatable list of `{ icon, title, text }` (admin add/remove rows)

5. **Learning Outcomes** — bullet list (admin add/remove)

6. **Course details grid** — Eligibility, Duration, Mode (Online/Offline/Hybrid), Batch Start Date, Language, Schedule. Each is a simple text field.

7. **FAQ** — repeatable `{ question, answer }` accordion

8. **Contact & Support** — phone, WhatsApp, email, address; admin editable

9. **Footer CTA strip** — repeat the form trigger

All sections always render; admin only edits content (per the chosen "Fixed sections, editable content" mode).

---

## Visual direction — Conversion-optimized Bansal

- Bansal Orange (`#F97316`) primary CTA, Bansal Navy (`#1E293B`) headings, `#FFFBF5` background — matches existing brand tokens, no new colors.
- Bigger CTA buttons, urgency badges (pulsing red dot for "limited seats"), live countdown timer, sticky form panel, mobile sticky bottom "Enroll now" bar.
- Trust strip below hero (autopopulated from existing `site_stats` if available, otherwise static numbers admin can edit).
- All colors via existing semantic tokens in `index.css` — no hardcoded hex in components.

---

## Data model (Lovable Cloud)

New migration creates two tables:

**`landing_page_config`** — single row (`id = 'default'`) holding all page content as structured JSONB:
```
id text PK
hero jsonb              -- { banner_url, title, subtitle, start_date, seats_left, seats_enabled, early_bird_deadline, early_bird_enabled, cta_label }
overview text
highlights jsonb        -- [{ icon, title, text }]
outcomes jsonb          -- [string]
details jsonb           -- { eligibility, duration, mode, batch_start, language, schedule }
faqs jsonb              -- [{ q, a }]
contact jsonb           -- { phone, whatsapp, email, address }
form_config jsonb       -- { show_city, show_message, submit_label, success_message }
is_published boolean
updated_at timestamptz
updated_by uuid
```
Grants: `SELECT` to `anon` + `authenticated` (page is public); `ALL` to `service_role`; `UPDATE` allowed via RLS only to admin/super_admin.

**`landing_page_leads`**:
```
id uuid PK
full_name text, phone text, email text
class_level text, city text, message text
source text default 'landing_new'
utm_source/medium/campaign text          -- captured from URL params
user_agent text, ip_hash text
status text default 'new'                -- new | contacted | converted | discarded
notes text
created_at timestamptz
```
Grants + RLS: `INSERT` allowed to `anon` (lead capture is public). `SELECT/UPDATE/DELETE` only admin/super_admin. Index on `(created_at desc)` and `(phone)`.

---

## Admin editor (`/admin/landing-page`)

Single form page with tabbed sections matching the page sections. Image upload uses existing Supabase storage bucket pattern. "Save" upserts the single config row. "Preview" opens `/new` in a new tab. "Publish toggle" controls whether `/new` shows the page or a "Coming soon" placeholder.

## Admin lead inbox (`/admin/landing-leads`)

- Table with name/phone/email/class/created/status, search + status filter + date range.
- Row click → drawer with full details + status dropdown + notes.
- "Export CSV" button.
- Notification badge on Admin Command Centre when new leads arrive (reuse existing `notifications` mechanism via a trigger that calls `notify_admins` on insert).

---

## Routing / nav

- Add route `/new` → `LandingNewPage.tsx` (public, no Layout chrome — its own minimal header with logo + phone CTA only).
- Add routes `/admin/landing-page` and `/admin/landing-leads` under existing admin route guard.
- Add two links in Admin Command Centre sidebar: "Landing Page" and "Landing Leads".
- SEO: `<title>`, meta description, OG image pulled from `landing_page_config.hero`. Single H1. Canonical to `/new`.

---

## Files to create / change

- `supabase/migrations/<ts>_landing_page.sql` — both tables, grants, RLS, seed default row, admin-notify trigger.
- `src/pages/LandingNewPage.tsx` — public page.
- `src/components/landing/` — `HeroSection.tsx`, `LeadForm.tsx`, `HighlightsGrid.tsx`, `OutcomesList.tsx`, `DetailsGrid.tsx`, `FAQAccordion.tsx`, `ContactBlock.tsx`, `StickyMobileCTA.tsx`, `CountdownTimer.tsx`.
- `src/pages/admin/AdminLandingPage.tsx` — config editor.
- `src/pages/admin/AdminLandingLeads.tsx` — inbox.
- `src/hooks/useLandingConfig.ts` — fetch + cache config.
- `src/lib/landingSchemas.ts` — zod schemas for form + config.
- `src/App.tsx` — register three routes.
- Admin sidebar component — add two links.

---

## Out of scope (call out)

- No payments on this page (CTA = lead form only; user said "Lead Generation" is the main game).
- No per-campaign slug pages — single `/new` only, as chosen.
- No WhatsApp/email auto-reply to leads — only admin inbox, as chosen.
- No section reordering or toggling — fixed layout, as chosen.

These can be follow-ups if needed later.
