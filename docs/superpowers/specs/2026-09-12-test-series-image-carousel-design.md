# Test Series Cover Image Fix + Multi-Image Carousel — Design

**Date:** 2026-09-12
**Status:** Approved

## Context

Ticket `fix-and-add-test-series-image-carousel.md` bundles a bug fix and a feature. Parts 1 and 2
are already implemented and committed as of this design doc:

- **Part 1 (fixed, commit `faca30bb`):** Root-caused via direct RLS impersonation, not guessed.
  `"Staff manage all test series"` (added in `20260704190000_centre_scoped_tests_and_series.sql`)
  restricted admin/super_admin `ALL` access to `centre_id IS NULL` rows. Three days later,
  `multicentre_backfill_to_kota.sql` retroactively stamped every existing `test_series` row with
  Kota's `centre_id`, so `centre_id IS NULL` matched zero rows — the policy became permanently
  unreachable. Any plain `admin` (not `super_admin`, not registered as Kota `centre_staff`)
  editing any test series had their `UPDATE` silently match zero RLS-visible rows: Postgres raises
  no error for that, so the app's `if (error)` check never fired, a success toast showed, and
  nothing persisted. Fixed by removing the `centre_id IS NULL` restriction from that policy
  (matching `AdminTestSeriesPage.tsx`'s list query, which was already patched for this exact
  backfill collision). Verified: the exact same impersonated update changed 0 rows before the fix,
  changed the row correctly after, and an unrelated franchise centre admin is still correctly
  blocked from editing Kota's test series (no over-broadening).
- **Part 2 (fixed, commit `a44a7232`):** Added a "Remove image" control next to "Click to replace
  cover" in `CreateTestSeriesPage.tsx`, clearing `thumbnail_url` on save. The public page already
  degrades gracefully (the cover image block is conditionally rendered on `thumbnail_url` being
  truthy).

This document covers **Part 3: the multi-image carousel.**

## Why not just extend the existing Page Banners tables

"Page Banners" (`/admin/banners`) is actually two separate systems, neither a clean fit:

- `site_banners` — one row per page via a `page_key` upsert-on-conflict; single image + headline/
  CTA. It already has a `test-series` key, but that governs the **catalog page's** (`/test-series`)
  hero banner, not a per-item carousel for one specific test series product.
- `landing_hero_banners` — the real reorderable/active/alt/link multi-row table, but it has **no
  scoping column at all** — it's a flat table hardcoded to the homepage.

Extending either to mean "many images per one dynamic `test_series_id`" would bolt on scoping
neither was built for. The rendering component, `HeroBannerCarousel.tsx`, is the reusable part —
it already takes a plain `{src, alt, link}[]` array with no data-fetching coupling.

## Data model — new `test_series_images` table

Shaped like `landing_hero_banners`, scoped per test series (the same way `test_questions` scopes
to `tests`):

```sql
CREATE TABLE public.test_series_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt text,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS delegates to `test_series`'s own ownership rules rather than duplicating role logic, and is
written **unconditionally** for staff (applying Part 1's lesson directly — no `centre_id IS NULL`
trap):

```sql
CREATE POLICY "Public view images of published test series"
ON public.test_series_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id AND ts.is_published = true
));

CREATE POLICY "Staff manage all test series images"
ON public.test_series_images FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Centre staff manage their own test series images"
ON public.test_series_images FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id
    AND ts.centre_id IS NOT NULL
    AND is_centre_staff(auth.uid(), ts.centre_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id
    AND ts.centre_id IS NOT NULL
    AND is_centre_staff(auth.uid(), ts.centre_id)
));
```

## Admin UI

New `src/components/admin/TestSeriesImagesEditor.tsx`, a close copy of
`LandingHeroBannersEditor.tsx`'s pattern (reorder via up/down arrows, Active toggle, alt text,
link URL, per-row upload, save, delete), parameterized by a `testSeriesId: string` prop instead of
being hardcoded to one table with no scope. Uploads go to the `educator-uploads` bucket (same
bucket the existing cover-image uploader already uses), path
`test-series-carousel/${testSeriesId}/${Date.now()}-${file.name}`.

Added as a new "Carousel Images" section in `CreateTestSeriesPage.tsx`, **shown only in edit
mode** — it needs a real `test_series_id`, which doesn't exist yet mid-create. The existing single
Cover Image field (Parts 1-2) is unchanged and stays as the fallback for series that never adopt
the carousel.

**Aspect ratio guidance:** the admin hint here must reflect the carousel's actual rendered ratio,
confirmed by reading `HeroBannerCarousel.tsx` directly — it renders at a hard `aspect-[2/1]`
(2:1), not 16:9 (the existing homepage editor's hint text is `ratio="16:9" size="1920×1080"`,
which is actually a pre-existing mismatch against the component's real 2:1 render — noted here for
transparency, left untouched as out of scope). The new editor uses real 2:1 numbers:
`<AspectRatioHint ratio="2:1" size="1600×800" note="test series carousel slide" />` — not a
copy-paste of either the mismatched homepage hint or the old single-cover-image's 4:3/1200×900.

## Shared carousel component

`HeroBannerCarousel.tsx` gains two new optional props, both defaulting to today's exact homepage
values so `LandingPage.tsx` requires zero changes:

```ts
type Props = {
  banners: Banner[];
  autoAdvanceMs?: number;
  badge?: string;          // default: "Latest Results" (current hardcoded homepage text)
  aspectRatio?: string;    // default: "2/1" (current hardcoded class)
};
```

The homepage call site is untouched (relies on defaults). The Test Series call site passes
`aspectRatio="2/1"` explicitly (matching the confirmed real dimension) and omits `badge` (no
"Latest Results" tag makes sense here — omitting it renders no badge).

## Public rendering

New hook `useTestSeriesImages(testSeriesId)` in `src/hooks/useTestSeries.ts` (TanStack Query),
selecting `id, image_url, alt, link, sort_order` from `test_series_images` where
`test_series_id = :id AND is_active = true`, ordered by `sort_order`.

In `TestSeriesDetailPage.tsx`, the existing static thumbnail block:
```tsx
{item.thumbnail_url && (
  <div className="overflow-hidden rounded-2xl border border-border bg-card aspect-[4/3] max-w-md">
    <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
  </div>
)}
```
is replaced with `HeroBannerCarousel`, fed by a backward-compatible fallback computed in the page:

```ts
const carouselImages = images.length > 0
  ? images.map((i) => ({ src: i.image_url, alt: i.alt || item.title, link: i.link }))
  : item.thumbnail_url
    ? [{ src: item.thumbnail_url, alt: item.title, link: null }]
    : [];
```

`HeroBannerCarousel` already returns `null` when given zero banners, and already hides arrows/dots
when given exactly one — so zero, one, and many images all render correctly with no extra
conditional logic needed in the page itself.

## Backward compatibility

No data migration. Existing test series with only `thumbnail_url` and no `test_series_images`
rows automatically render as a single-slide "carousel" (arrows/dots hidden, exactly today's visual
result) via the fallback above. A series only gets the full carousel experience once an admin adds
rows through the new editor.

## Out of scope

- No changes to `site_banners`, `landing_hero_banners`, `AdminBannersPage.tsx`, or
  `LandingHeroBannersEditor.tsx` — including the pre-existing 16:9-label/2:1-render mismatch noted
  above, which is a separate, unrelated cleanup.
- No forced migration of `thumbnail_url` into `test_series_images` rows.

## Testing

- Typecheck (`tsc --noEmit`) and production build after each file change.
- Direct RLS verification via impersonation (as used for Part 1): confirm a plain admin, a
  super_admin, and an unrelated franchise centre admin each get correct SELECT/INSERT/UPDATE/
  DELETE behavior on `test_series_images`.
- Manual/browser check: add 0, 1, and 3+ images to a test series via the new editor, confirm the
  public page renders correctly in each case, confirm reorder/active-toggle/delete all work, and
  confirm the homepage carousel is visually unchanged.
