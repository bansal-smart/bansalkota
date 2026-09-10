# Test Series Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a lead-capture registration form ahead of the existing Test Series Cashfree checkout, store submissions in a new `test_series_registrations` table, and add a parallel Super Admin "Test Series Registrations" module under Commerce — without touching BOOST.

**Architecture:** A new modal component (`TestSeriesRegistrationModal`) replaces the direct checkout call on `TestSeriesDetailPage`'s "Enroll Now" button. On submit it inserts a registration row (owned by the authenticated user via RLS), calls the existing unmodified `startCashfreeCheckout`, then links the resulting `orders.id` back onto the registration via a SECURITY DEFINER RPC. A new admin list page reads `test_series_registrations` joined to `orders` for payment status — `orders` stays the single source of payment truth.

**Tech Stack:** React + TypeScript + Vite, Supabase (Postgres/RLS/RPC), Zod, TanStack Query (existing `useTestSeries` hooks — not touched), Tailwind, `sonner` toasts, Cashfree v3 SDK (existing `src/lib/cashfree.ts` — not touched).

## Global Constraints

- Do not modify `src/components/BoostRegistrationModal.tsx`, `src/pages/AdminBoostPage.tsx`, `src/pages/AdminBoostContentPage.tsx`, `boost_registrations`, or any `cashfree-boost-*` edge function — BOOST must be fully unaffected.
- Do not modify `src/lib/cashfree.ts` or `supabase/functions/cashfree-create-order/index.ts` — the existing authenticated `orderType: "test_series"` checkout is reused as-is.
- `test_series_registrations` never stores payment status directly — payment status is always read live via the `order_id` join to `orders.status`.
- New Super Admin page uses **1-indexed** pagination state throughout (both the query offset math and the `TablePagination` `page` prop) — do not replicate the 0-indexed/1-indexed mismatch present in `AdminBoostPage.tsx`.
- New Commerce sidebar entry goes in `mainGroups` only (super_admin/admin nav), **not** in `centreNav` — `test_series_registrations` RLS grants only `user_id = auth.uid()` and admin/super_admin, no centre-staff policy, so a centre-nav link would 404-empty for centre admins. This mirrors "Books / E-Store" / "E-Store Orders", which are also admin-only Commerce items, not BOOST's centre-visible pattern.
- **Noted deviation from the design doc's literal wording:** the doc says "reuse BOOST's `CLASS_LEVELS` list" for the `class_level` field. BOOST's list (`"IV to V Moving"`, `"X to XI (Medical) Moving"`, etc.) is worded for a moving-grade scholarship exam and doesn't fit Test Series' NEET/JEE audience, whose class values the ticket itself shows as "Class XI/XII". Task 2 below uses a plain `["IX", "X", "XI", "XII", "Dropper"]` list instead — same field, sensible options for this audience, not literal BOOST copy-paste.

---

## Task 1: Database — `test_series_registrations` table, RLS, and linking RPC

**Files:**
- Create: `supabase/migrations/20260910070000_test_series_registrations.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: table `public.test_series_registrations` with columns `id, user_id, test_series_id, test_series_title, full_name, email, phone, class_level, target_exam, school_name, city, state, parent_name, parent_phone, order_id, status, notes, created_at, updated_at`.
- Produces: RPC `public.link_test_series_registration_order(p_registration_id uuid, p_order_id uuid) RETURNS void`.
- Consumes: existing `public.orders` table (columns verified live: `id, user_id, status, subtotal, shipping_fee, total, currency, ..., cf_order_id, cf_payment_session_id, provider, created_at, updated_at`), existing `public.test_series(id)`, existing `public.update_updated_at_column()` trigger function (already used by `boost_registrations`), existing `public.app_role` enum and `has_role()` function.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260910070000_test_series_registrations.sql
-- Lead-capture registration form ahead of Test Series checkout, mirroring the
-- BOOST registration pattern but keeping payment truth in `orders` (this flow
-- reuses the existing authenticated cashfree-create-order/test_series
-- checkout, unlike BOOST's separate anonymous payment path) rather than
-- duplicating payment_status/amount columns onto the registration row.

CREATE TABLE public.test_series_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  test_series_title text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  class_level text NOT NULL,
  target_exam text,
  school_name text,
  city text,
  state text,
  parent_name text,
  parent_phone text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'registered',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_series_registrations_status_check CHECK (status IN ('registered', 'cancelled'))
);

CREATE INDEX idx_test_series_registrations_created_at ON public.test_series_registrations (created_at);
CREATE INDEX idx_test_series_registrations_test_series_id ON public.test_series_registrations (test_series_id);
CREATE INDEX idx_test_series_registrations_status ON public.test_series_registrations (status);
CREATE INDEX idx_test_series_registrations_user_id ON public.test_series_registrations (user_id);
CREATE INDEX idx_test_series_registrations_order_id ON public.test_series_registrations (order_id);

CREATE TRIGGER update_test_series_registrations_updated_at
  BEFORE UPDATE ON public.test_series_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_series_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own test series registration"
  ON public.test_series_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own test series registration"
  ON public.test_series_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage test series registrations"
  ON public.test_series_registrations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

GRANT INSERT, SELECT ON public.test_series_registrations TO authenticated;
GRANT ALL ON public.test_series_registrations TO service_role;

-- Attaches the order created by the existing authenticated Cashfree checkout
-- back onto the registration row. A SECURITY DEFINER function (rather than a
-- broader UPDATE grant to `authenticated`) so a user can only ever link an
-- order that is both their own registration AND their own order — Postgres
-- RLS alone can't express "may update only this one column, only once,
-- only when both rows are already mine" without a trigger; this is simpler.
CREATE OR REPLACE FUNCTION public.link_test_series_registration_order(
  p_registration_id uuid,
  p_order_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.test_series_registrations
  SET order_id = p_order_id
  WHERE id = p_registration_id
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_test_series_registration_order(uuid, uuid) TO authenticated;
```

- [ ] **Step 2: Apply the migration to the connected Supabase project**

Use the `mcp__supabase__apply_migration` tool with `name: "test_series_registrations"` and `query` set to the exact SQL from Step 1 (the tool records it in the project's migration history the same way the CLI would).

- [ ] **Step 3: Verify the table, policies, and RPC exist**

Run via `mcp__supabase__execute_sql`:
```sql
select count(*) from public.test_series_registrations;
```
Expected: `0` (table exists, empty, no RLS error since this runs as the service/postgres role).

```sql
select policyname, cmd from pg_policies where schemaname='public' and tablename='test_series_registrations' order by policyname;
```
Expected: 3 rows — `"Admins manage test series registrations"` (ALL), `"Users insert their own test series registration"` (INSERT), `"Users view their own test series registration"` (SELECT).

```sql
select proname from pg_proc where proname = 'link_test_series_registration_order';
```
Expected: 1 row.

- [ ] **Step 4: Regenerate TypeScript types so the new table/RPC are strongly typed**

Use `mcp__supabase__generate_typescript_types`, then write its output over `src/integrations/supabase/types.ts` with the Write tool. Confirm the new table appears:

Run: `grep -n "test_series_registrations" "C:\Users\user\bansalkota\src\integrations\supabase\types.ts"`
Expected: matches under both `Tables` and (for the RPC) `Functions`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260910070000_test_series_registrations.sql src/integrations/supabase/types.ts
git commit -m "feat: add test_series_registrations table, RLS, and order-linking RPC"
```

---

## Task 2: Public registration modal

**Files:**
- Create: `src/components/TestSeriesRegistrationModal.tsx`

**Interfaces:**
- Consumes: `useAppStore` (`src/store/useAppStore.ts`) — `AppUser = { id: string; full_name: string; email: string; role; target_exam; avatar_url? }`. `supabase` client (`src/integrations/supabase/client.ts`). `startCashfreeCheckout({ orderType: "test_series", testSeriesId }): Promise<{ order_id: string; payment_session_id: string; cf_order_id: string | null; env: string }>` (`src/lib/cashfree.ts`, unmodified). `CityAutocompleteInput` (`src/components/CityAutocompleteInput.tsx`) — props `{ value, onChange, onSelectCity?, name?, className? }`. `BansalButton` (`src/components/bansal/BansalButton.tsx`) — prop `variant="cta"`.
- Produces: `export default function TestSeriesRegistrationModal(props: { open: boolean; onClose: () => void; testSeries: { id: string; title: string; target_exam: string | null; price: number } })`. Consumed by Task 3.

- [ ] **Step 1: Write the component**

```tsx
// src/components/TestSeriesRegistrationModal.tsx
import { useState } from "react";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { startCashfreeCheckout } from "@/lib/cashfree";
import BansalButton from "@/components/bansal/BansalButton";
import CityAutocompleteInput from "@/components/CityAutocompleteInput";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  class_level: z.string().min(1, "Select your class"),
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  parent_name: z.string().trim().max(120).optional().or(z.literal("")),
  parent_phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^$|^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
    .optional()
    .or(z.literal("")),
});

const CLASS_LEVELS = ["IX", "X", "XI", "XII", "Dropper"];

type TestSeriesInfo = { id: string; title: string; target_exam: string | null; price: number };
type Props = { open: boolean; onClose: () => void; testSeries: TestSeriesInfo };

function onlyDigitsInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  el.value = el.value.replace(/\D/g, "").slice(0, 10);
}

const inputClass =
  "w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange";

export default function TestSeriesRegistrationModal({ open, onClose, testSeries }: Props) {
  const user = useAppStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to continue");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Please check the form");
      return;
    }
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      test_series_id: testSeries.id,
      test_series_title: testSeries.title,
      target_exam: testSeries.target_exam,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      class_level: parsed.data.class_level,
      school_name: parsed.data.school_name || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      parent_name: parsed.data.parent_name || null,
      parent_phone: parsed.data.parent_phone || null,
    };
    const { data: inserted, error } = await supabase
      .from("test_series_registrations")
      .insert([payload as any])
      .select("id")
      .single();
    if (error || !inserted) {
      setSubmitting(false);
      toast.error(error?.message || "Could not save registration");
      return;
    }
    try {
      const result = await startCashfreeCheckout({ orderType: "test_series", testSeriesId: testSeries.id });
      const { error: linkErr } = await supabase.rpc("link_test_series_registration_order", {
        p_registration_id: inserted.id,
        p_order_id: (result as { order_id: string }).order_id,
      });
      if (linkErr) console.error("Failed to link registration to order", linkErr);
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border bg-card">
          <div>
            <h2 className="font-display text-xl font-bold text-bansal-black">Register for {testSeries.title}</h2>
            <p className="text-xs text-muted-foreground">Just a few details before you proceed to payment.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full name *</label>
              <input name="full_name" required defaultValue={user?.full_name ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email *</label>
              <input name="email" type="email" required defaultValue={user?.email ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Mobile *</label>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onInput={onlyDigitsInput}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Class *</label>
              <select name="class_level" required defaultValue="" className={inputClass}>
                <option value="" disabled>Select class</option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">School name</label>
              <input name="school_name" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">City</label>
              <CityAutocompleteInput
                name="city"
                value={city}
                onChange={setCity}
                onSelectCity={(c, s) => { setCity(c); setState(s); }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">State</label>
              <input name="state" value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parent name</label>
              <input name="parent_name" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parent phone</label>
              <input
                name="parent_phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onInput={onlyDigitsInput}
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-lg bg-bansal-cream/50 border border-bansal-orange/30 p-4 text-sm">
            <div className="font-semibold text-bansal-black">
              Enrollment fee: ₹{Number(testSeries.price).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be redirected to Cashfree's secure checkout (UPI, cards, netbanking, wallets) to complete payment.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <BansalButton variant="cta" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to payment"}
            </BansalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p "C:\Users\user\bansalkota"`
Expected: no new errors referencing `TestSeriesRegistrationModal.tsx` (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 3: Commit**

```bash
git add src/components/TestSeriesRegistrationModal.tsx
git commit -m "feat: add TestSeriesRegistrationModal for pre-payment lead capture"
```

---

## Task 3: Wire the modal into the Test Series enrollment flow

**Files:**
- Modify: `src/pages/TestSeriesDetailPage.tsx`

**Interfaces:**
- Consumes: `TestSeriesRegistrationModal` from Task 2 (`{ open, onClose, testSeries: { id, title, target_exam, price } }`).

- [ ] **Step 1: Replace the direct-checkout `handleEnroll` with a modal-opening one**

In `src/pages/TestSeriesDetailPage.tsx`, replace the import block and `handleEnroll`:

```tsx
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShoppingCart, Tag, Trophy, BookOpen, Video, ClipboardList, Shirt, Umbrella, HelpCircle, Backpack } from "lucide-react";
import { useTestSeriesDetail } from "@/hooks/useTestSeries";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { useState } from "react";
import Seo, { SITE_URL } from "@/components/Seo";
import TestSeriesRegistrationModal from "@/components/TestSeriesRegistrationModal";
```

(This drops the now-unused `startCashfreeCheckout` import — the modal owns that call.)

Replace:
```tsx
  const { user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [placing, setPlacing] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      toast.info("Please sign in to continue with enrollment");
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    if (!item) return;

    setPlacing(true);
    try {
      await startCashfreeCheckout({ orderType: "test_series", testSeriesId: item.id });
    } catch (e) {
      setPlacing(false);
      toast.error((e as Error).message || "Could not start payment");
    }
  };
```
with:
```tsx
  const { user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [regOpen, setRegOpen] = useState(false);

  const handleEnroll = () => {
    if (!user) {
      toast.info("Please sign in to continue with enrollment");
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    setRegOpen(true);
  };
```

- [ ] **Step 2: Update the Enroll Now button and render the modal**

Replace:
```tsx
            <button
              onClick={handleEnroll}
              disabled={placing}
              className="mt-5 w-full rounded-xl bg-[hsl(var(--bansal-orange))] py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Enroll Now
            </button>
```
with:
```tsx
            <button
              onClick={handleEnroll}
              className="mt-5 w-full rounded-xl bg-[hsl(var(--bansal-orange))] py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 inline-flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Enroll Now
            </button>
```

Then, immediately before the closing `</div>` of the page's outermost `<div className="bg-background">` (right after the closing `</section>` that contains the aside), add:
```tsx
      {item && (
        <TestSeriesRegistrationModal
          open={regOpen}
          onClose={() => setRegOpen(false)}
          testSeries={{ id: item.id, title: item.title, target_exam: item.target_exam, price: item.price }}
        />
      )}
    </div>
  );
};

export default TestSeriesDetailPage;
```
(replacing the file's existing closing `    </div>\n  );\n};\n\nexport default TestSeriesDetailPage;`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p "C:\Users\user\bansalkota"`
Expected: no errors in `TestSeriesDetailPage.tsx` (in particular, no "unused variable `placing`" or "cannot find name `startCashfreeCheckout`" errors — confirms the cleanup was complete).

- [ ] **Step 4: Commit**

```bash
git add src/pages/TestSeriesDetailPage.tsx
git commit -m "feat: open registration modal before Test Series checkout"
```

---

## Task 4: Admin sidebar, permission module, and route registration

**Files:**
- Modify: `src/lib/adminModules.ts`
- Modify: `src/components/AdminLayout.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: route `/admin/test-series-registrations` rendering `AdminTestSeriesRegistrationsPage` (created in Task 5).
- Produces: `adminModules` entry with `key: "test_series_registrations"` — consumed automatically by `AdminLayout.tsx`'s existing `PATH_TO_MODULE` map (no extra gating code needed, same as "boost").

- [ ] **Step 1: Add the permission module**

In `src/lib/adminModules.ts`, in the `// Commerce` block:
```ts
  // Commerce
  { key: "books", label: "Books / E-Store", path: "/admin/books", actions: ["view", "create", "edit", "delete"] },
  { key: "orders", label: "E-Store Orders", path: "/admin/orders", actions: ["view", "edit", "export"] },
  { key: "boost", label: "BOOST Registrations", path: "/admin/boost", actions: ["view", "edit", "delete", "export"] },
  { key: "test_series_registrations", label: "Test Series Registrations", path: "/admin/test-series-registrations", actions: ["view", "edit", "delete", "export"] },
```

- [ ] **Step 2: Add the sidebar entry (mainGroups only, per Global Constraints)**

In `src/components/AdminLayout.tsx`, add `ClipboardList` to the lucide-react import list:
```tsx
import {
  LayoutDashboard,
  CircleDot,
  Inbox,
  FileText,
  Flag,
  Users,
  GraduationCap,
  Video,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Settings,
  ShieldCheck,
  FileBarChart,
  BookOpen,
  MapPin,
  Image as ImageIcon,
  Award,
  Quote,
  BarChart3,
  LifeBuoy,
  Megaphone,
  Bell,
} from "lucide-react";
```

Then in the `Commerce` group of `mainGroups`:
```tsx
  {
    label: "Commerce",
    items: [
      { label: "Books / E-Store", icon: BookOpen, path: "/admin/books" },
      { label: "E-Store Orders", icon: BookOpen, path: "/admin/orders" },
      { label: "BOOST Registrations", icon: Award, path: "/admin/boost" },
      { label: "Test Series Registrations", icon: ClipboardList, path: "/admin/test-series-registrations" },
      { label: "BOOST Page", icon: FileText, path: "/admin/boost-page" },
    ],
  },
```

- [ ] **Step 3: Register the lazy import and route**

In `src/App.tsx`, next to the existing BOOST lazy imports:
```tsx
const AdminBoostPage = lazy(() => import("./pages/AdminBoostPage"));
const AdminBoostContentPage = lazy(() => import("./pages/AdminBoostContentPage"));
const AdminTestSeriesRegistrationsPage = lazy(() => import("./pages/AdminTestSeriesRegistrationsPage"));
```

And next to the existing BOOST routes:
```tsx
                  <Route path="/admin/boost" element={<AdminBoostPage />} />
                  <Route path="/admin/boost-page" element={<AdminBoostContentPage />} />
                  <Route path="/admin/test-series-registrations" element={<AdminTestSeriesRegistrationsPage />} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p "C:\Users\user\bansalkota"`
Expected: a "Cannot find module './pages/AdminTestSeriesRegistrationsPage'" error is **expected and correct** at this point — Task 5 creates that file. Confirm no *other* new errors in `adminModules.ts` / `AdminLayout.tsx` / `App.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminModules.ts src/components/AdminLayout.tsx src/App.tsx
git commit -m "feat: register Test Series Registrations admin route, module, and sidebar entry"
```

---

## Task 5: Super Admin "Test Series Registrations" page

**Files:**
- Create: `src/pages/AdminTestSeriesRegistrationsPage.tsx`

**Interfaces:**
- Consumes: `useDebouncedValue` (`src/hooks/useDebouncedValue.ts`), `TablePagination` + `TABLE_PAGE_SIZE_ALL`/`TABLE_PAGE_SIZE_OPTIONS` (`src/components/TablePagination.tsx`), `supabase` client. Table `test_series_registrations` (Task 1) joined to `orders(status, total, created_at)` via `order_id`.
- Produces: default export `AdminTestSeriesRegistrationsPage`, imported by Task 4's `App.tsx` route as `./pages/AdminTestSeriesRegistrationsPage`.

- [ ] **Step 1: Write the page**

```tsx
// src/pages/AdminTestSeriesRegistrationsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Search, Download, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import TablePagination, { TABLE_PAGE_SIZE_ALL } from "@/components/TablePagination";

type OrderInfo = { status: string; total: number | null; created_at: string } | null;

type Registration = {
  id: string;
  user_id: string;
  test_series_id: string;
  test_series_title: string;
  full_name: string;
  email: string;
  phone: string;
  class_level: string;
  target_exam: string | null;
  school_name: string | null;
  city: string | null;
  state: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  order_id: string | null;
  status: "registered" | "cancelled";
  notes: string | null;
  created_at: string;
  orders: OrderInfo;
};

type TestSeriesOption = { id: string; title: string };

const STATUS_OPTIONS = ["all", "registered", "cancelled"] as const;
const SELECT_COLUMNS =
  "id, user_id, test_series_id, test_series_title, full_name, email, phone, class_level, target_exam, school_name, city, state, parent_name, parent_phone, order_id, status, notes, created_at, orders:order_id(status, total, created_at)";

const AdminTestSeriesRegistrationsPage = () => {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [seriesOptions, setSeriesOptions] = useState<TestSeriesOption[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const applyFilters = (query: any) => {
    if (debouncedQ.trim()) {
      const needle = debouncedQ.trim().replace(/[%(),]/g, " ");
      query = query.or(
        `full_name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%,test_series_title.ilike.%${needle}%`,
      );
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (seriesFilter !== "all") query = query.eq("test_series_id", seriesFilter);
    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
    if (toDate) {
      const end = new Date(`${toDate}T00:00:00`);
      end.setDate(end.getDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
    return query;
  };

  const load = async () => {
    setLoading(true);
    const { data: seriesRows } = await supabase.from("test_series").select("id, title").order("title");
    setSeriesOptions((seriesRows ?? []) as TestSeriesOption[]);

    if (pageSize === TABLE_PAGE_SIZE_ALL) {
      const all: Registration[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await applyFilters(
          supabase
            .from("test_series_registrations")
            .select(SELECT_COLUMNS)
            .order("created_at", { ascending: false })
            .range(from, from + 999),
        );
        if (error) {
          toast.error(error.message);
          break;
        }
        const chunk = (data ?? []) as unknown as Registration[];
        all.push(...chunk);
        if (chunk.length < 1000) break;
        from += 1000;
      }
      setRows(all);
      setTotal(all.length);
    } else {
      const { data, error, count } = await applyFilters(
        supabase
          .from("test_series_registrations")
          .select(SELECT_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1),
      );
      if (error) toast.error(error.message);
      else {
        setRows((data ?? []) as unknown as Registration[]);
        setTotal(count ?? 0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, statusFilter, seriesFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, seriesFilter, fromDate, toDate]);

  const totalPages = pageSize === TABLE_PAGE_SIZE_ALL ? 1 : Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    const totalCount = rows.length;
    const withOrder = rows.filter((r) => r.orders).length;
    const paid = rows.filter((r) => r.orders?.status === "paid").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    return { totalCount, withOrder, paid, cancelled };
  }, [rows]);

  const update = async (id: string, patch: Partial<Pick<Registration, "status" | "notes">>) => {
    const { error } = await supabase.from("test_series_registrations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Registration);
  };

  const exportCsv = async () => {
    const exportRows: Registration[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await applyFilters(
        supabase
          .from("test_series_registrations")
          .select(SELECT_COLUMNS)
          .order("created_at", { ascending: false })
          .range(from, from + 999),
      );
      if (error) return toast.error(error.message);
      exportRows.push(...((data ?? []) as unknown as Registration[]));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    const headers = [
      "full_name", "email", "phone", "class_level", "target_exam", "test_series_title",
      "school_name", "city", "state", "parent_name", "parent_phone",
      "status", "payment_status", "order_total", "created_at",
    ];
    const csv = [headers.join(",")]
      .concat(
        exportRows.map((r) => {
          const flat: Record<string, unknown> = {
            ...r,
            payment_status: r.orders?.status ?? "no order",
            order_total: r.orders?.total ?? "",
          };
          return headers
            .map((h) => {
              const v = flat[h];
              const s = v == null ? "" : String(v).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(",");
        }),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-series-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportRows.length} registration${exportRows.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-bansal-orange" /> Test Series Registrations
          </h1>
          <p className="text-sm text-muted-foreground">Leads captured before Test Series checkout</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Export {total ? `(${total} filtered)` : "CSV"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.totalCount },
          { label: "With order", value: stats.withOrder },
          { label: "Paid", value: stats.paid },
          { label: "Cancelled", value: stats.cancelled },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, test series…"
            className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>Status: {o}</option>
          ))}
        </select>
        <select
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Test series: all</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-foreground outline-none" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-foreground outline-none" />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Class</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Test Series</th>
                <th className="text-left p-3">City</th>
                <th className="text-left p-3">Payment</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer"
                >
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.class_level}</td>
                  <td className="p-3 text-xs">{r.email}<br />{r.phone}</td>
                  <td className="p-3">{r.test_series_title}</td>
                  <td className="p-3">{r.city ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.orders?.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : r.orders?.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : r.orders
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.orders?.status ?? "no order"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex rounded-full bg-bansal-blue/10 text-bansal-blue px-2 py-0.5 text-[10px] font-bold">{r.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No registrations match your filters.</td></tr>
              )}
            </tbody>
          </table>
          <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-card shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
              <h2 className="font-bold">{selected.full_name}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              <Field label="Class" value={selected.class_level} />
              {selected.target_exam && <Field label="Target Exam" value={selected.target_exam} />}
              <Field label="Test Series" value={selected.test_series_title} />
              {selected.school_name && <Field label="School" value={selected.school_name} />}
              {selected.city && <Field label="City / State" value={`${selected.city}, ${selected.state ?? ""}`} />}
              {selected.parent_name && <Field label="Parent" value={`${selected.parent_name} · ${selected.parent_phone ?? ""}`} />}
              <Field label="Payment status" value={selected.orders?.status ?? "No order started"} />
              {selected.orders?.total != null && <Field label="Order total" value={`₹${Number(selected.orders.total).toLocaleString("en-IN")}`} />}

              <div className="pt-3 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Registration status</label>
                <select
                  value={selected.status}
                  onChange={(e) => update(selected.id, { status: e.target.value as Registration["status"] })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="registered">registered</option>
                  <option value="cancelled">cancelled</option>
                </select>

                <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <textarea
                  defaultValue={selected.notes ?? ""}
                  onBlur={(e) => e.target.value !== (selected.notes ?? "") && update(selected.id, { notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase text-muted-foreground font-semibold">{label}</div>
    <div className="text-foreground">{value}</div>
  </div>
);

export default AdminTestSeriesRegistrationsPage;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p "C:\Users\user\bansalkota"`
Expected: no errors. This also confirms Task 4's `App.tsx` import now resolves.

- [ ] **Step 3: Build**

Run: `npm run build --prefix "C:\Users\user\bansalkota"`
Expected: build succeeds (this exercises the whole app, not just this file — catches any remaining wiring mistakes across Tasks 2-5).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminTestSeriesRegistrationsPage.tsx
git commit -m "feat: add Test Series Registrations admin list/filter/export page"
```

---

## Task 6: End-to-end verification

**Files:** none (manual/browser verification only)

**Interfaces:** none — this task exercises Tasks 1-5 together against the running app.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev --prefix "C:\Users\user\bansalkota"` (background)

- [ ] **Step 2: Verify the student registration flow (use the `webapp-testing` skill / Playwright)**

- Log in as a student account.
- Navigate to any published `/test-series/:slug` page.
- Click **Enroll Now** — confirm `TestSeriesRegistrationModal` opens (not an immediate Cashfree redirect).
- Fill the form and submit.
- Confirm the Cashfree checkout modal opens (sandbox mode is expected here — don't complete a real payment).
- Via `mcp__supabase__execute_sql`, confirm a new row exists:
  ```sql
  select id, user_id, test_series_id, full_name, status, order_id
  from public.test_series_registrations
  order by created_at desc limit 1;
  ```
  Expected: the row matches the submitted details; `order_id` is populated (non-null) once the checkout call completed — if the Cashfree modal was only opened and not completed, `order_id` should still be set (linking happens right after `startCashfreeCheckout` returns the session, before payment completion).

- [ ] **Step 3: Verify the Super Admin page**

- Log in as `admin` or `super_admin`.
- Confirm **Test Series Registrations** appears in the sidebar under Commerce, directly under BOOST Registrations.
- Open `/admin/test-series-registrations` — confirm the row from Step 2 is listed with correct name/class/contact/test series/city, and a payment badge (`pending`, since sandbox checkout wasn't completed).
- Test search (by the submitted name), the status filter, the test-series filter, and the date range.
- Click the row to open the detail drawer; change status to `cancelled` and back to `registered`; add a note; confirm both persist (via `mcp__supabase__execute_sql` re-check or page reload).
- Click Export and confirm a CSV downloads with a header row and the test row.

- [ ] **Step 4: Confirm BOOST is unaffected (regression check)**

- Open `/boost` — confirm **Register Now** still opens `BoostRegistrationModal` unchanged and the page renders normally.
- Open `/admin/boost` as admin — confirm **BOOST Registrations** still lists existing rows, and **BOOST Page** is still a separate sidebar entry pointing at `/admin/boost-page`.
- Via `mcp__supabase__execute_sql`, confirm `boost_registrations` row count is unchanged from before this feature's testing (no cross-writes):
  ```sql
  select count(*) from public.boost_registrations;
  ```

- [ ] **Step 5: Final commit (if Step 2-4 surfaced any fixes)**

If any fixes were needed during verification, stage and commit them individually with a message describing what was found and fixed — do not bundle unrelated fixes into one commit.
