# Test Series Registration — Design

**Date:** 2026-09-10
**Status:** Approved

## Goal

Insert a lead-capture registration form into the Test Series enrollment funnel,
mirroring the existing BOOST registration pattern, and give Super Admin a
parallel **"Test Series Registrations"** module under Commerce — without
touching BOOST or the existing, already-functional Test Series checkout.

Today, clicking **Enroll Now** on `/test-series/:slug`
([src/pages/TestSeriesDetailPage.tsx](../../../src/pages/TestSeriesDetailPage.tsx))
requires login and calls `startCashfreeCheckout({ orderType: "test_series", testSeriesId })`
directly — no registration/lead record is captured before payment.

## Decision: payment flow stays as-is

Two options were considered:
1. **Keep login + existing checkout** (chosen) — insert a `test_series_registrations`
   row, then call the existing, proven `startCashfreeCheckout` unchanged.
2. BOOST-style anonymous registration + a new dedicated
   `cashfree-test-series-pay` edge function + manual "team will contact you"
   confirmation.

Chosen: **(1)**. Test Series checkout already works, is authenticated, and
already resolves price server-side from `test_series`. Reusing it means
`orders`/`order_items` (via `cashfree-create-order`) stay the single source of
truth for payment status — the new table is a lead/contact-details record,
not a second, competing payment-status tracker. This avoids the exact
duplication BOOST has (its own edge function, its own payment columns on the
registration row, admin "Mark Paid" button reimplementing what a webhook
should own).

## Flow

1. User (logged in) opens `/test-series/:slug`, clicks **Enroll Now**.
2. Instead of calling checkout immediately, this opens
   `TestSeriesRegistrationModal` (new component, modeled on
   [src/components/BoostRegistrationModal.tsx](../../../src/components/BoostRegistrationModal.tsx)),
   pre-filled with `test_series_id`, `test_series_title`, and `target_exam`
   from the page already in memory.
3. On submit:
   a. `supabase.from("test_series_registrations").insert({...})` with
      `user_id: auth.uid()` (via RLS `WITH CHECK`, not client-trusted).
   b. Call the **existing, unmodified** `startCashfreeCheckout({ orderType: "test_series", testSeriesId })`.
   c. Once checkout returns `order_id`, call RPC
      `link_test_series_registration_order(p_registration_id, p_order_id)` to
      attach it to the registration row (ownership-checked server-side).
   d. If checkout fails to start, the registration row still exists (same
      "still have a reference even if payment couldn't launch" fallback BOOST
      uses) — show an error toast, keep the modal open with a retry option
      rather than a fabricated success state.
4. Payment status is never duplicated onto the registration row — the admin
   page joins `orders.status` through `order_id` to display it.

## Form fields

Mirrors `BoostRegistrationModal`'s Zod-validated fields, trimmed to what's not
already known (user is authenticated, so no separate account creation):

| Field | Type | Notes |
|---|---|---|
| `full_name` | text | required, min 2 / max 120 |
| `phone` | tel | required, digit-only filter, `^[6-9]\d{9}$` |
| `email` | email | required, prefilled from `auth.users`/profile, editable |
| `class_level` | select | required; reuse BOOST's `CLASS_LEVELS` list |
| `school_name` | text | optional, max 160 |
| `city` | `CityAutocompleteInput` | optional, max 80 (reused component) |
| `state` | text | optional, auto-filled by city autocomplete |
| `parent_name` | text | optional, max 120 |
| `parent_phone` | tel | optional, same digit filter/regex |
| `test_series_id` | hidden | from page context, not user-editable |
| `test_series_title` | hidden | snapshot, from page context |
| `target_exam` | hidden | snapshot, from `test_series.target_exam` |

## Data model — `test_series_registrations`

New migration, e.g. `supabase/migrations/<timestamp>_test_series_registrations.sql`:

```sql
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
  status text NOT NULL DEFAULT 'registered', -- 'registered' | 'cancelled'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_series_registrations_created_at ON public.test_series_registrations (created_at);
CREATE INDEX idx_test_series_registrations_test_series_id ON public.test_series_registrations (test_series_id);
CREATE INDEX idx_test_series_registrations_status ON public.test_series_registrations (status);
CREATE INDEX idx_test_series_registrations_user_id ON public.test_series_registrations (user_id);

-- reuse the same generic trigger BOOST uses
CREATE TRIGGER update_test_series_registrations_updated_at
  BEFORE UPDATE ON public.test_series_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

No `payment_status`/`amount`/`cf_order_id` columns — deliberately, per the
payment-flow decision above. Payment truth lives in `orders`, joined via
`order_id`.

### RLS

```sql
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
```

No direct end-user UPDATE policy (unlike a naive copy of BOOST's shape) —
users never need to edit their own registration, and admins already get
UPDATE via the `FOR ALL` policy above.

### `link_test_series_registration_order` RPC

```sql
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
```

Ownership of both rows is checked inside the function, so no broader UPDATE
grant to `authenticated` is needed — this is the safer alternative to giving
users column-level UPDATE rights, which Postgres RLS can't express directly
without a trigger.

## Super Admin module: "Test Series Registrations"

New page `src/pages/AdminTestSeriesRegistrationsPage.tsx`, modeled directly on
[src/pages/AdminBoostPage.tsx](../../../src/pages/AdminBoostPage.tsx)'s
registrations list (not its embedded settings/syllabus panels — those have no
Test Series equivalent and aren't needed here):

- **Route:** `/admin/test-series-registrations`, registered in `src/App.tsx`
  the same way as `/admin/boost`.
- **Sidebar:** add to the `Commerce` group in
  [src/components/AdminLayout.tsx](../../../src/components/AdminLayout.tsx),
  directly under "BOOST Registrations", plus the `centreNav` group.
- **Permission module:** add `{ key: "test_series_registrations", label: "Test Series Registrations", path: "/admin/test-series-registrations", actions: ["view","edit","delete","export"] }`
  to [src/lib/adminModules.ts](../../../src/lib/adminModules.ts) (Commerce block).
- **List/filter:** server-side paginated list of `test_series_registrations`
  joined to `orders(status, total, payment_reference)` via `order_id`;
  free-text search (name/phone/email), filters for `status`, `test_series_id`,
  and created-date range — same shape as BOOST's `applyFilters()`.
- **Payment column:** rendered from the joined `orders.status`
  (`pending`/`paid`/`failed`/— if `order_id` is null), **no "Mark Paid" button** —
  that state belongs to Cashfree's webhook, not manual admin override, since
  this flow (unlike BOOST) has a real webhook-backed order.
- **Status column:** `registered`/`cancelled`, editable in a detail drawer with
  a `notes` textarea — same interaction pattern as BOOST's drawer.
- **Export:** CSV export scoped to current filters, same batched-range pattern
  as `AdminBoostPage.tsx`'s `exportCsv()`.
- **Pagination:** use `TablePagination` **1-indexed throughout** (query state
  and the component prop both 1-indexed) — deliberately not copying the
  0-indexed/1-indexed mismatch found in `AdminBoostPage.tsx` during research.

## Out of scope (confirmed)

- No new "Test Series Page" content-CMS module. `src/pages/AdminTestSeriesPage.tsx`
  / `CreateTestSeriesPage.tsx` (under the Test Platform Hub) already own the
  product catalog (title, price, discount, features, publish/feature flags,
  centre scoping) and are untouched.
- BOOST's table, edge functions, and admin page are untouched — fully
  parallel systems, no shared table or code path beyond visually-similar UI
  patterns.

## Testing

- Manual verification via `webapp-testing`/Playwright: log in as a student,
  open a test series page, confirm Enroll Now opens the modal (not checkout
  directly), submit, confirm a `test_series_registrations` row exists with
  `order_id` populated after checkout starts.
- Confirm the new Super Admin page lists that registration with correct
  joined payment status, and that search/filter/export work.
- Confirm BOOST's `/boost` page and `/admin/boost` are visually/functionally
  unaffected (regression check, not a rewrite).
