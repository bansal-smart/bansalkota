# Dynamic BOOST Page — Design

**Date:** 2026-08-01
**Status:** Approved (approach + rendering model)

## Goal

Make the public `/boost` page ([src/pages/BoostPage.tsx](../../../src/pages/BoostPage.tsx))
fully content-managed by KOTA HQ admins. Today most of the page is hardcoded
inline. After this change, HQ admins can CRUD the following sections from the
admin panel, and the public page renders from stored data:

1. **Legacy of Excellence** (intro + "What is BOOST?" callout)
2. **Benefits of BOOST**
3. **Exam Structure** ("BOOST Details" table)
4. **Scholarship Grid**
5. **Important Instructions & Notes**
6. **Timeline**
7. **FAQs**

The hero, stats strip, and final CTA remain driven by the existing
`boost_settings` (price, exam dates) + `site_banners` — out of scope here.

## Who can edit ("KOTA HQ admin")

Matches the existing `boost_settings` model: **`admin` OR `super_admin`**.
Franchise `center_admin`s never see the `/admin/boost` page (it lives in the
HQ-only "Commerce" nav group), and RLS blocks their writes server-side.

## Storage — single JSON document

One new single-row table `boost_page_content` with a `content jsonb` column,
fixed id, seeded with the current page content (so nothing changes visually on
day one — the data is "pre-existing"). RLS mirrors `boost_settings`:
public read; `admin OR super_admin` write.

Rationale for JSON over normalized tables: display-only marketing content edited
by a few HQ admins; the exam-structure and scholarship tables don't normalize
cleanly (merged cells, 2-D grid); 7 normalized tables + hooks + policies is far
more surface area for no real benefit. Full CRUD per section still happens in the
admin editor (add / edit / remove / reorder in memory, saved as one blob).

### Content shape

```ts
type BoostContent = {
  legacy: {
    badge: string;         // "Legacy of Excellence"
    heading: string;       // "Education City Kota's Oldest Institute"
    body: string;          // main paragraph (plain text)
    calloutTitle: string;  // "What is BOOST?"
    calloutBody: string;   // the highlighted paragraph
  };
  benefits: Array<{
    icon: string;          // whitelisted lucide name, e.g. "Trophy"
    title: string;
    desc: string;
  }>;
  examStructure: {
    paramHeader: string;   // "Parameter"
    columns: string[];     // exam columns, e.g. ["NEEV (Foundation)", "JEE (Main & Advanced)", "NEET (UG)"]
    rows: Array<
      | { label: string; cells: string[] }               // one value per column
      | { label: string; span: string; href?: string }   // spans all columns; href => link
    >;
    legend: string;
    markingScheme: string;
  };
  scholarshipGrid: Array<{ score: string; scholarship: string }>; // auto-numbered, auto-split L/R
  notes: string[];         // ordered "Important Instructions & Notes"
  timeline: Array<{ phase: string; date: string; desc: string }>;
  faqs: Array<{ q: string; a: string }>;
};
```

### Price token

Anywhere the live registration price appears in content (timeline item 1, some
FAQs), the seeded text uses a `{price}` placeholder. The renderer replaces
`{price}` with `boost_settings.price_inr` at render time, keeping price
single-sourced (no drift between content and settings).

## Read path

New `useBoostContent` hook (react-query, mirrors [useSiteBanner](../../../src/hooks/useSiteBanner.ts)):
fetches the single row, returns typed `BoostContent`. The current hardcoded
values become `DEFAULTS`, used as fallback when the row is missing or the fetch
fails — so the page always renders, identical to today, even offline.

`BoostPage` is refactored to consume `useBoostContent()` for the 7 sections and
continues to use `useBoostSettings()` for price/dates and `useSiteBanner("boost")`
for the hero.

## Write path

New `BoostContentPanel` component, rendered inside
[AdminBoostPage](../../../src/pages/AdminBoostPage.tsx) below the existing
`BoostSettingsPanel`. One collapsible sub-editor per section:

- **Legacy** — 5 text fields.
- **Benefits** — reorderable list; each row: icon dropdown (lucide whitelist) + title + desc; add/remove.
- **Exam Structure** — edit `paramHeader`, column headers (add/remove column reconciles each row's `cells`), rows (toggle a row between per-column cells and a spanning cell; spanning cell has text + optional URL), legend, markingScheme.
- **Scholarship Grid** — single reorderable list of `{ score, scholarship }`; add/remove. Sr.No auto-derived.
- **Notes** — reorderable list of textareas; add/remove.
- **Timeline** — reorderable list of `{ phase, date, desc }`; add/remove.
- **FAQs** — reorderable list of `{ q, a }`; add/remove.

Saves the whole document via one `update ... eq(id)`. UI shown only to HQ admins;
RLS enforces the same rule server-side.

## Rendering details

- **Exam Structure**: renders a `<table>`. `paramHeader` + `columns` form the
  header. A `cells` row emits one `<td>` per column; a `span` row emits a single
  `<td colSpan={columns.length}>` centered (an `<a>` when `href` is present).
  Note: `<sup>` ordinals become plain text and a couple of per-row font weights
  are standardized — content/structure preserved.
- **Scholarship Grid**: `scholarshipGrid` split at `ceil(n/2)` into two
  side-by-side tables; Sr.No = index + 1. Reproduces today's 1–5 / 6–10 layout.
- **Benefits / Timeline / Notes / FAQs**: same markup as today, mapped from data.
  Icon name resolved through a fixed `ICON_MAP`; unknown/missing → default icon.

## Files

- `supabase/migrations/<ts>_boost_page_content.sql` — table, RLS, trigger, seed.
- `src/hooks/useBoostContent.ts` — read hook + `DEFAULTS` + types + `ICON_MAP` + `{price}` helper.
- `src/pages/BoostPage.tsx` — refactor to consume the hook.
- `src/components/admin/BoostContentPanel.tsx` — admin editor.
- `src/pages/AdminBoostPage.tsx` — mount the panel.
- `src/integrations/supabase/types.ts` — add table type (regenerate or hand-add).

## Out of scope

Hero banner/headline (already `site_banners`), price/exam dates (already
`boost_settings`), registration flow, payment.
