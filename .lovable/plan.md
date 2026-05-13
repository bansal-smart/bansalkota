## 1. Slugified live-class URLs

**Schema change** (migration):
- Add `slug TEXT UNIQUE` column to `public.live_classes`.
- Backfill existing rows: `slug = slugify(title) || '-' || substr(id::text, 1, 6)` to guarantee uniqueness.
- Add a trigger `BEFORE INSERT/UPDATE OF title` that auto-generates the slug from `title` if `slug` is null or `title` changed, again suffixing with the first 6 chars of the row id to avoid collisions.
- Make `slug NOT NULL` after backfill.

**Routing** (`src/App.tsx`):
- `/live-classes/:id` → `/live-classes/:slug`
- `/teacher/live-classes/:id` → `/teacher/live-classes/:slug`

**Pages updated to lookup by slug**:
- `src/pages/LiveClassRoomPage.tsx` — read `slug` param, query `live_classes.select(*).eq('slug', slug)`. All downstream queries (messages, attendance, realtime channel) keep using the resolved `cls.id`.
- `src/pages/TeacherLiveClassRoomPage.tsx` — same treatment.

**Link generators updated to use slug**:
- `src/pages/StudentDashboard.tsx`, `src/pages/LiveClassesListPage.tsx` → `/live-classes/${cls.slug}`
- `src/pages/TeacherLiveClassesPage.tsx` → `/teacher/live-classes/${cls.slug}`
- `src/hooks/useLiveClasses.ts` row type gains `slug: string`.

**Backwards compat**: keep nothing — old `/live-classes/:uuid` links will 404 to the existing NotFound. (If you'd rather keep them working, say so and I'll add a fallback that detects a UUID and redirects to the slug.)

## 2. Arke logo overlay on the Jitsi iframe

The Jitsi watermark lives inside a cross-origin iframe and can't be removed from outside it. The hash-config flags I added before (`SHOW_JITSI_WATERMARK=false`, etc.) are honored by self-hosted Jitsi but ignored by `meet.jit.si`, which is why you still see it. Solution: **cover it** with the Arke logo positioned absolutely over the iframe's top-left corner.

In `src/pages/LiveClassRoomPage.tsx` and `src/pages/TeacherLiveClassRoomPage.tsx`:
- Wrap the iframe in a `relative` container.
- Add an absolutely-positioned `<img src={arkeLogo} />` at top-left (approx `top-3 left-3`, height ~36px on desktop, ~24px on mobile, `pointer-events-none` so it doesn't block clicks, with a subtle dark backdrop pill so it reads on the Jitsi prejoin black background).
- Use the existing `src/assets/arke-logo.jpeg` import.

This visually replaces the Jitsi mark with Arke's logo without breaking the iframe.

## 3. Replace "Arambh" / "aarambh" with "Arke Scholars"

Found references:
- `supabase/functions/send-transactional-email/index.ts` — `SITE_NAME = "arambhapp"` → `"Arke Scholars"`. Redeploy `send-transactional-email`.
- `supabase/functions/_shared/transactional-email-templates/_styles.ts` — `SITE_NAME = 'Arambh'` → `'Arke Scholars'`; update the comment too. This is the value rendered inside every transactional email body (welcome, payment receipt, doubt-answered, live-class reminder, mentor-message), so it covers the email confirmation/welcome message you mentioned.
- `src/pages/UnsubscribePage.tsx` — three "Back to Arambh" labels and one "from Arambh" sentence → "Arke Scholars".
- Redeploy all transactional email functions so the new SITE_NAME ships: `send-transactional-email`, plus the shared templates take effect via redeploy of `send-transactional-email` (templates are bundled into that function).

Auth confirmation emails: the Supabase auth-email-hook isn't scaffolded in this project, so confirmation emails currently use Supabase's default templates. The "From" name shown in inboxes for auth emails is set by the email-domain sender configuration. After the SITE_NAME swap above, all custom transactional emails (welcome, receipts, etc.) will say "Arke Scholars". If the auth confirmation email itself still shows "Arambh" in subject/from after this change, it's coming from the email-domain sender name configured in Cloud → Emails — tell me and I'll guide you to update that field (it's not editable from code).

## Files touched

- New migration adding `slug` to `live_classes` + trigger + backfill
- `src/App.tsx`
- `src/pages/LiveClassRoomPage.tsx`
- `src/pages/TeacherLiveClassRoomPage.tsx`
- `src/pages/StudentDashboard.tsx`
- `src/pages/LiveClassesListPage.tsx`
- `src/pages/TeacherLiveClassesPage.tsx`
- `src/hooks/useLiveClasses.ts`
- `src/pages/UnsubscribePage.tsx`
- `supabase/functions/send-transactional-email/index.ts`
- `supabase/functions/_shared/transactional-email-templates/_styles.ts`
- Redeploy `send-transactional-email`
