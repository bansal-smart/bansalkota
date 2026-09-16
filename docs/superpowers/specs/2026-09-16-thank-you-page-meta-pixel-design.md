# Meta Pixel Purchase Tracking on Payment Confirmation — Design

## Context

The originating ticket (`feature-thank-you-page-meta-pixel.md`) asked for a new "Thank You"
page shared across E-Store, BOOST Registration, and Test Series Registration, firing Meta Pixel
conversion events only after webhook-confirmed payment success.

Investigation before design found the ticket's premise was incorrect on two points:

1. **A Thank You page already exists — twice.** Both flows already land on a page that verifies
   payment status against the database/Cashfree API and shows honest paid/pending/failed states:
   - [`src/pages/PaymentReturnPage.tsx`](../../../src/pages/PaymentReturnPage.tsx) at
     `/payments/return?order_id=...` — used by **both** E-Store cart checkout and Test Series
     Registration (both go through `cashfree-create-order` and share this return URL).
   - [`src/pages/BoostPaymentReturnPage.tsx`](../../../src/pages/BoostPaymentReturnPage.tsx) at
     `/boost/payment-return?reg_id=...` — used by BOOST Registration, polling for confirmation.

   Neither page fires any Meta Pixel event today. That is the actual gap.

2. **BOOST's payment is genuinely webhook-confirmed, not manual/offline.**
   [`supabase/functions/cashfree-webhook/index.ts`](../../../supabase/functions/cashfree-webhook/index.ts#L56-L82)
   has a dedicated branch (keyed on `order_id.startsWith("boost_")`) that flips
   `boost_registrations.payment_status` from `pending` → `paid` on a genuine Cashfree
   `PAYMENT_SUCCESS_WEBHOOK`, structurally identical to the E-Store/`orders` branch. The
   "our team will contact you to confirm payment" copy in `BoostRegistrationModal.tsx` only
   appears in a catch-block fallback (shown if the Cashfree API call fails to even start) — not
   the normal path.

Decision (confirmed with stakeholder): given real, webhook-confirmed payment exists for all
three flows, **all three fire `Purchase` with the real amount** — no `Lead`/`CompleteRegistration`
branch is needed anywhere in this feature.

## Scope decision

Rather than building a new consolidated `/thank-you` route (which would require migrating two
working edge functions' `return_url` values and carries real risk to in-flight Cashfree orders
for no functional benefit), this design **adds Pixel firing directly into the two existing,
already-correct return pages**. No new route, no new page, no edge-function `return_url` changes.

## Design

### 1. Dedupe-guarded tracking utility (`src/lib/metaPixel.ts`)

Add one function, reusing the existing `trackMetaEvent` (already guards on `META_PIXEL_ID` /
`window.fbq` presence — no new raw `fbq` calls):

```ts
export function trackPurchaseOnce(dedupeKey: string, value: number, currency = "INR") {
  if (typeof window === "undefined") return;
  const storageKey = `meta_pixel_purchase_${dedupeKey}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // localStorage unavailable (private mode / disabled) — fire once for this
    // page load; no cross-session guard possible in that case.
  }
  trackMetaEvent("Purchase", { value, currency });
}
```

**`localStorage`, not `sessionStorage`.** A payment confirmation URL is exactly the kind of link
revisited later (email receipt, browser history, bookmark) in a fresh tab, where `sessionStorage`
would already be empty and would let a false repeat "Purchase" fire. `localStorage` survives
that. Confirmed with stakeholder.

Call sites prefix the dedupe key by flow (`order:<uuid>` / `boost:<uuid>`) to avoid any
theoretical collision between an `orders.id` and a `boost_registrations.id`.

### 2. `PaymentReturnPage.tsx` (E-Store + Test Series)

In the existing `verify()` effect, when `data.status === "paid"`:

```ts
if (data.status === "paid") {
  clearCart();
  if (data.order?.total != null) {
    trackPurchaseOnce(`order:${orderId}`, Number(data.order.total));
  }
}
```

`order.total` is already returned by `cashfree-verify-order` in both the fast-path
(`order.status === "paid"` in DB) and the polled-from-Cashfree path — no backend change needed
for this page.

### 3. `BoostPaymentReturnPage.tsx` (BOOST Registration)

In the polling loop, when `s === "paid"`:

```ts
if (s === "paid") {
  setStatus("paid");
  if (data?.amount != null) {
    trackPurchaseOnce(`boost:${regId}`, Number(data.amount));
  }
  return;
}
```

Requires one small backend addition: `cashfree-boost-verify/index.ts` currently selects `amount`
from `boost_registrations` but never returns it in its JSON response. Add `amount: reg.amount` to
both the "already paid" fast-path return and the main return at the bottom of the function.

### 4. Failure/pending/cancelled/error states

No changes. Both pages already show honest non-success states for every other status value, and
the new tracking calls are only reached inside the `status === "paid"` / `s === "paid"` branches
— there is no code path where a non-confirmed order can trigger `trackPurchaseOnce`.

### 5. Out of scope

- No new `/thank-you` route.
- No changes to `cashfree-create-order` or `cashfree-boost-pay` (the order-creation functions) —
  their `return_url` values stay exactly as they are.
- No `Lead`/`CompleteRegistration` event anywhere in this feature (superseded by the BOOST
  decision above).
- No `content_ids`/`content_type`/`content_name` enrichment of the `Purchase` event — the ticket's
  literal example (`value`, `currency`) is what ships; richer product-level data can be a
  follow-up if the client wants it in Meta reporting later.

## Testing / verification plan

- `npx tsc --noEmit` and `npm run build` after the change, to confirm no type errors and that the
  new code paths are correctly bundled.
- **Cannot** be verified end-to-end from this environment: no browser to run a real/sandbox
  Cashfree payment through to completion, and no Meta Business Manager access to confirm the
  `Purchase` event lands correctly in Events Manager's Test Events tool with the right value. This
  needs to happen after deployment, same limitation noted on the earlier Pixel tasks in this
  project.
- The `cashfree-boost-verify` edge function change needs deploying to Supabase separately from the
  frontend build — flagged clearly if this session has no ability to deploy it directly.

## Deliverable

- `trackPurchaseOnce` utility added to `src/lib/metaPixel.ts`.
- `PaymentReturnPage.tsx` and `BoostPaymentReturnPage.tsx` fire `Purchase` with the real amount
  exactly once per order/registration, guarded by `localStorage`, only on confirmed `paid` status.
- `cashfree-boost-verify` returns `amount` in its response.
- No new page, no new route, no changes to order-creation edge functions.
