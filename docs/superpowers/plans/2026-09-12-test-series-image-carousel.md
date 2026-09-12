# Test Series Multi-Image Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins attach multiple reorderable, toggleable carousel images to a Test Series, rendered publicly with the same left/right-arrow + dot-indicator carousel used on the homepage.

**Architecture:** A new `test_series_images` table (scoped per test series, shaped like `landing_hero_banners`) backs a new admin editor component modeled on `LandingHeroBannersEditor.tsx`. The existing `HeroBannerCarousel.tsx` gains two optional, backward-compatible props so it can be reused as-is for Test Series instead of duplicated. The public page falls back to the legacy single `thumbnail_url` as a one-slide carousel when no `test_series_images` rows exist — no data migration needed.

**Tech Stack:** React + TypeScript + Vite, Supabase (Postgres/RLS), TanStack Query, Tailwind, `sonner` toasts.

## Global Constraints

- Do not modify `site_banners`, `landing_hero_banners`, `AdminBannersPage.tsx`, or `LandingHeroBannersEditor.tsx` — including the pre-existing 16:9-label/2:1-render mismatch in the homepage editor's hint text, which is out of scope here.
- `HeroBannerCarousel.tsx`'s new `badge`/`aspectRatio` props must both default to today's exact hardcoded homepage values (`"Latest Results"` and `"2/1"`) so `LandingPage.tsx` requires zero changes.
- The new admin editor's aspect-ratio hint must show real 2:1 numbers (`ratio="2:1"`, `size="1600×800"`) — not 16:9/1920×1080 (the homepage editor's mismatched hint) and not 4:3/1200×900 (the old single-cover-image guidance).
- No data migration: existing test series with only `thumbnail_url` and zero `test_series_images` rows must keep rendering correctly (as a single-slide carousel) with no backfill step.
- `test_series_images` RLS must grant staff/super_admin access **unconditionally** (no `centre_id IS NULL` restriction) — this is the exact class of bug fixed in the prior `faca30bb` commit; do not reintroduce it.

---

## Task 1: `test_series_images` table, RLS, and regenerated types

**Files:**
- Create: `supabase/migrations/20260912080000_test_series_images.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: table `public.test_series_images` with columns `id, test_series_id, image_url, alt, link, sort_order, is_active, created_at, updated_at`.
- Consumes: existing `public.test_series(id, is_published, centre_id)`, `public.update_updated_at_column()` trigger function, `public.has_role()`, `public.is_centre_staff()`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260912080000_test_series_images.sql
-- Multi-image carousel for Test Series, modeled on landing_hero_banners'
-- shape (reorderable, active toggle, alt text, optional link) but scoped
-- per test_series_id rather than being a flat, homepage-only table — neither
-- landing_hero_banners (no scoping column) nor site_banners (one row per
-- page_key, not per dynamic entity) cleanly fit "many images per one test
-- series product". RLS delegates to test_series' own ownership rather than
-- duplicating role logic, and is written unconditionally for staff (no
-- centre_id IS NULL trap — see the 20260912070000 fix this directly learns
-- from).

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

CREATE INDEX idx_test_series_images_test_series_id ON public.test_series_images (test_series_id);
CREATE INDEX idx_test_series_images_sort_order ON public.test_series_images (test_series_id, sort_order);

CREATE TRIGGER update_test_series_images_updated_at
  BEFORE UPDATE ON public.test_series_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_series_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view images of published test series"
ON public.test_series_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.test_series ts
  WHERE ts.id = test_series_images.test_series_id AND ts.is_published = true
));

CREATE POLICY "Staff manage all test series images"
ON public.test_series_images FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

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

GRANT SELECT ON public.test_series_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_series_images TO authenticated;
GRANT ALL ON public.test_series_images TO service_role;
```

- [ ] **Step 2: Apply the migration to the connected Supabase project**

Use `mcp__supabase__apply_migration` with `name: "test_series_images"` and `query` set to the exact SQL from Step 1.

- [ ] **Step 3: Verify the table and policies exist**

Run via `mcp__supabase__execute_sql`:
```sql
select count(*) from public.test_series_images;
```
Expected: `0`.

```sql
select policyname, cmd from pg_policies where schemaname='public' and tablename='test_series_images' order by policyname;
```
Expected: 3 rows — `"Centre staff manage their own test series images"` (ALL), `"Public view images of published test series"` (SELECT), `"Staff manage all test series images"` (ALL).

- [ ] **Step 4: Verify RLS end-to-end via impersonation (matching the Part 1 verification method)**

Find a real test series id and the three account ids already used earlier this session (a plain admin not in centre_staff anywhere, e.g. `content@bansal.ac.in`; the super_admin `9dd04146-4142-48a4-8e1f-2dbd3bbff9b9`; an unrelated franchise centre admin, e.g. `gmsroad@bansal.ac.in` = `0bf8659b-0e86-4ccd-b398-27bffff2af4b`). Run via `mcp__supabase__execute_sql`:

```sql
set local role authenticated;
set local request.jwt.claim.sub = 'cb6e3e88-9e7f-48a7-80d5-28041e99d486'; -- content@bansal.ac.in, plain admin
insert into public.test_series_images (test_series_id, image_url, alt, sort_order)
values ('ad65584d-fe77-421a-8c8a-83cd2bb3b7ab', 'https://example.com/verify.png', 'test', 0)
returning id;
```
Expected: succeeds (plain admin can now manage any test series' images, unconditionally).

```sql
set local role authenticated;
set local request.jwt.claim.sub = '0bf8659b-0e86-4ccd-b398-27bffff2af4b'; -- gmsroad, unrelated centre admin
select count(*) from public.test_series_images where test_series_id = 'ad65584d-fe77-421a-8c8a-83cd2bb3b7ab';
```
Expected: `0` (an unrelated franchise centre admin cannot see Kota's test series images — SELECT is public-only for *published* series' images, and this series may not be published, or in any case this confirms no accidental centre-staff-wide grant).

Clean up the verification row:
```sql
delete from public.test_series_images where image_url = 'https://example.com/verify.png';
```

- [ ] **Step 5: Regenerate TypeScript types**

Use `mcp__supabase__generate_typescript_types`, then write its `types` field over `src/integrations/supabase/types.ts` with the Write tool (the result is large JSON; extract via a small Node script rather than reading it into context — e.g. `node -e "const fs=require('fs'); fs.writeFileSync('src/integrations/supabase/types.ts', JSON.parse(fs.readFileSync('<result-file>','utf8')).types)"`).

Run: `grep -n "test_series_images" "src/integrations/supabase/types.ts"`
Expected: matches under `Tables`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260912080000_test_series_images.sql src/integrations/supabase/types.ts
git commit -m "feat: add test_series_images table and RLS for the carousel feature"
```

---

## Task 2: Admin editor component — `TestSeriesImagesEditor`

**Files:**
- Create: `src/components/admin/TestSeriesImagesEditor.tsx`

**Interfaces:**
- Consumes: `AspectRatioHint` (`src/components/admin/AspectRatioHint.tsx`, props `{ ratio, size, note }`), `supabase` client, `educator-uploads` storage bucket (already used by `CreateTestSeriesPage.tsx`'s cover-image uploader).
- Produces: `export default function TestSeriesImagesEditor(props: { testSeriesId: string })`. Consumed by Task 3.

- [ ] **Step 1: Write the component**

```tsx
// src/components/admin/TestSeriesImagesEditor.tsx
import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type Row = {
  id?: string;
  image_url: string;
  alt: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  _dirty?: boolean;
  _new?: boolean;
};

type Props = { testSeriesId: string };

const TestSeriesImagesEditor = ({ testSeriesId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_series_images")
      .select("id, image_url, alt, link, sort_order, is_active")
      .eq("test_series_id", testSeriesId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as any[]).map((r) => ({ ...r })) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testSeriesId]);

  const update = (idx: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)));
  };

  const uploadImage = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const path = `test-series-carousel/${testSeriesId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("educator-uploads").upload(path, file);
    if (error) {
      setUploadingIdx(null);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("educator-uploads").getPublicUrl(path);
    update(idx, { image_url: data.publicUrl });
    setUploadingIdx(null);
    toast.success("Image uploaded");
  };

  const addRow = () => {
    setRows((rs) => [
      ...rs,
      {
        image_url: "",
        alt: "",
        link: "",
        sort_order: rs.length ? Math.max(...rs.map((r) => r.sort_order)) + 1 : 0,
        is_active: true,
        _dirty: true,
        _new: true,
      },
    ]);
  };

  const saveRow = async (idx: number) => {
    const r = rows[idx];
    if (!r.image_url) return toast.error("Upload an image first");
    setSavingId(r.id ?? `new-${idx}`);
    const payload = {
      test_series_id: testSeriesId,
      image_url: r.image_url,
      alt: r.alt || null,
      link: r.link || null,
      sort_order: r.sort_order,
      is_active: r.is_active,
    };
    if (r.id) {
      const { error } = await supabase.from("test_series_images").update(payload as any).eq("id", r.id);
      if (error) {
        setSavingId(null);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("test_series_images")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) {
        setSavingId(null);
        return toast.error(error.message);
      }
      update(idx, { id: (data as any).id, _new: false });
    }
    setSavingId(null);
    setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, _dirty: false, _new: false } : x)));
    toast.success("Saved");
  };

  const removeRow = async (idx: number) => {
    const r = rows[idx];
    if (!confirm("Delete this image?")) return;
    if (r.id) {
      const { error } = await supabase.from("test_series_images").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows((rs) => rs.filter((_, i) => i !== idx));
    toast.success("Removed");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[idx];
    const b = rows[j];
    const next = [...rows];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[j] = { ...a, sort_order: b.sort_order };
    setRows(next);
    if (a.id) await supabase.from("test_series_images").update({ sort_order: b.sort_order }).eq("id", a.id);
    if (b.id) await supabase.from("test_series_images").update({ sort_order: a.sort_order }).eq("id", b.id);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Carousel Images</h2>
          <p className="text-xs text-muted-foreground">
            These images rotate in a carousel on the public test series page. Use the arrows to
            reorder. Toggle Active to hide an image without deleting it.
          </p>
          <AspectRatioHint ratio="2:1" size="1600×800" note="test series carousel slide" />
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add image
        </button>
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No carousel images yet. Click "Add image" to upload the first one.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="rounded-xl border border-border bg-background p-3 grid gap-3 md:grid-cols-[180px_1fr_auto] items-start">
            <div>
              {r.image_url ? (
                <img src={r.image_url} alt="" className="h-24 w-44 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-24 w-44 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold cursor-pointer hover:bg-muted">
                {uploadingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(i, e.target.files[0])}
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                placeholder="Alt text (for accessibility)"
                value={r.alt ?? ""}
                onChange={(e) => update(i, { alt: e.target.value })}
              />
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                placeholder="Link URL (optional)"
                value={r.link ?? ""}
                onChange={(e) => update(i, { link: e.target.value })}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  onChange={(e) => update(i, { is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="text-xs text-muted-foreground">Sort: {r.sort_order}</div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => saveRow(i)}
                disabled={!r._dirty || savingId !== null}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingId === (r.id ?? `new-${i}`) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 text-destructive px-2.5 py-1.5 text-xs font-bold hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestSeriesImagesEditor;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/TestSeriesImagesEditor.tsx
git commit -m "feat: add TestSeriesImagesEditor admin component"
```

---

## Task 3: Wire the editor into the Test Series edit page

**Files:**
- Modify: `src/pages/CreateTestSeriesPage.tsx`

**Interfaces:**
- Consumes: `TestSeriesImagesEditor` from Task 2 (`{ testSeriesId: string }`).

- [ ] **Step 1: Import the component**

```tsx
import TestSeriesImagesEditor from "@/components/admin/TestSeriesImagesEditor";
```

- [ ] **Step 2: Add the "Carousel Images" section, edit mode only**

Immediately after the closing `</div>` of the existing "Cover Image" section (the block containing `<h2 className="text-sm font-bold text-foreground">Cover Image</h2>`), add:

```tsx
      {isEditMode && id && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <TestSeriesImagesEditor testSeriesId={id} />
        </div>
      )}
```

This only renders once a real `id` exists (edit mode), since `test_series_images` rows need a real `test_series_id` foreign key that doesn't exist during "Create New Test Series".

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreateTestSeriesPage.tsx
git commit -m "feat: show Carousel Images editor on the Test Series edit page"
```

---

## Task 4: Make `HeroBannerCarousel` reusable via optional props

**Files:**
- Modify: `src/components/landing/HeroBannerCarousel.tsx`

**Interfaces:**
- Produces: `HeroBannerCarousel(props: { banners: Banner[]; autoAdvanceMs?: number; badge?: string; aspectRatio?: string })` — `badge` defaults to `"Latest Results"`, `aspectRatio` defaults to `"2/1"`. Consumed unchanged by `LandingPage.tsx` (relies on both defaults) and by Task 6 (`TestSeriesDetailPage.tsx`, passing `badge=""` and `aspectRatio="2/1"` explicitly).

- [ ] **Step 1: Add the two optional props**

Replace:
```tsx
type Props = {
  banners: Banner[];
  autoAdvanceMs?: number;
};

export default function HeroBannerCarousel({ banners, autoAdvanceMs = 4500 }: Props) {
```
with:
```tsx
type Props = {
  banners: Banner[];
  autoAdvanceMs?: number;
  badge?: string;
  aspectRatio?: string;
};

export default function HeroBannerCarousel({
  banners,
  autoAdvanceMs = 4500,
  badge = "Latest Results",
  aspectRatio = "2/1",
}: Props) {
```

- [ ] **Step 2: Make the aspect ratio dynamic**

Replace:
```tsx
    <div
      className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
```
with:
```tsx
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-white"
      style={{ aspectRatio }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
```

- [ ] **Step 3: Make the badge optional**

Replace:
```tsx
      <span className="absolute top-3 right-3 rounded-full bg-bansal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
        Latest Results
      </span>
```
with:
```tsx
      {badge && (
        <span className="absolute top-3 right-3 rounded-full bg-bansal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          {badge}
        </span>
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Confirm the homepage call site needs no changes**

Run: `grep -n "HeroBannerCarousel" src/pages/LandingPage.tsx`
Expected: the existing call passes only `banners={...}` (no `badge`/`aspectRatio`/or passes `autoAdvanceMs` at most) — confirming it relies on the new defaults and renders identically to before.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/HeroBannerCarousel.tsx
git commit -m "feat: make HeroBannerCarousel's badge and aspect ratio configurable"
```

---

## Task 5: `useTestSeriesImages` data hook

**Files:**
- Modify: `src/hooks/useTestSeries.ts`

**Interfaces:**
- Produces: `export type TestSeriesImageRow = { id: string; image_url: string; alt: string | null; link: string | null; sort_order: number }` and `export const useTestSeriesImages = (testSeriesId: string | undefined) => { images: TestSeriesImageRow[]; loading: boolean }`. Consumed by Task 6.

- [ ] **Step 1: Add the hook**

Append to `src/hooks/useTestSeries.ts`:

```ts
export type TestSeriesImageRow = {
  id: string;
  image_url: string;
  alt: string | null;
  link: string | null;
  sort_order: number;
};

export const useTestSeriesImages = (testSeriesId: string | undefined) => {
  const query = useQuery({
    queryKey: ["test_series", "images", testSeriesId],
    enabled: !!testSeriesId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_series_images")
        .select("id, image_url, alt, link, sort_order")
        .eq("test_series_id", testSeriesId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TestSeriesImageRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { images: query.data ?? [], loading: query.isPending };
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTestSeries.ts
git commit -m "feat: add useTestSeriesImages hook"
```

---

## Task 6: Render the carousel on the public Test Series page

**Files:**
- Modify: `src/pages/TestSeriesDetailPage.tsx`

**Interfaces:**
- Consumes: `useTestSeriesImages` from Task 5, `HeroBannerCarousel` from Task 4 (`{ banners: {src, alt, link}[], aspectRatio?, badge? }`).

- [ ] **Step 1: Import the new hook and component**

Replace:
```tsx
import { useTestSeriesDetail } from "@/hooks/useTestSeries";
```
with:
```tsx
import { useTestSeriesDetail, useTestSeriesImages } from "@/hooks/useTestSeries";
import HeroBannerCarousel from "@/components/landing/HeroBannerCarousel";
```

- [ ] **Step 2: Fetch images and compute the backward-compatible fallback**

Replace:
```tsx
  const { item, loading } = useTestSeriesDetail(slug);
  const { user } = useAppStore();
```
with:
```tsx
  const { item, loading } = useTestSeriesDetail(slug);
  const { images } = useTestSeriesImages(item?.id);
  const { user } = useAppStore();
```

Then, immediately after the existing `if (!item) { return (...); }` block (i.e. right before `const discount = item.discount_percent ?? 0;`), add:
```tsx
  const carouselImages = images.length > 0
    ? images.map((i) => ({ src: i.image_url, alt: i.alt || item.title, link: i.link }))
    : item.thumbnail_url
      ? [{ src: item.thumbnail_url, alt: item.title, link: null }]
      : [];
```

- [ ] **Step 3: Replace the static thumbnail block with the carousel**

Replace:
```tsx
          {item.thumbnail_url && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card aspect-[4/3] max-w-md">
              <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
            </div>
          )}
```
with:
```tsx
          {carouselImages.length > 0 && (
            <HeroBannerCarousel banners={carouselImages} aspectRatio="2/1" badge="" />
          )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/TestSeriesDetailPage.tsx
git commit -m "feat: render the carousel on the public Test Series page"
```

---

## Task 7: End-to-end verification

**Files:** none (manual/browser verification only)

- [ ] **Step 1: Zero-images backward compatibility (SQL + build already covers this — confirm explicitly)**

Pick a published test series with `thumbnail_url` set and zero `test_series_images` rows. Confirm via `mcp__supabase__execute_sql`:
```sql
select ts.id, ts.thumbnail_url, count(tsi.id) as image_count
from public.test_series ts
left join public.test_series_images tsi on tsi.test_series_id = ts.id
where ts.id = '<that series id>'
group by ts.id, ts.thumbnail_url;
```
Expected: `image_count = 0`, `thumbnail_url` non-null — this is the exact case `carouselImages` falls back on.

- [ ] **Step 2: Manual browser check (use the `webapp-testing` skill / Playwright, or `npm run dev` + manual click-through)**

- Start the dev server.
- Navigate to that series' public page; confirm the single `thumbnail_url` renders via the carousel (no arrows/dots, since `HeroBannerCarousel` hides them when `banners.length <= 1`).
- Log in as an admin, open `/admin/test-series/<id>/edit`, confirm the new "Carousel Images" section appears below Cover Image.
- Add 3 images via "Add image" + Upload + Save each; confirm they appear, reorder two with the up/down arrows, toggle one Active off, delete one.
- Revisit the public page: confirm the carousel now shows only the active images in the saved order, with arrows and dot indicators, and that clicking a dot/arrow navigates correctly.
- Confirm the homepage (`/`) carousel is visually unchanged (badge still shows "Latest Results", same aspect ratio).

- [ ] **Step 3: Final commit (if Step 2 surfaced any fixes)**

If any fixes were needed during manual verification, stage and commit them individually with a message describing what was found and fixed.
