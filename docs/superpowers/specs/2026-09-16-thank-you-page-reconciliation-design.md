# Thank You Page Reconciliation + Expanded Button Tracking — Design

## Context

Follow-up to `feature-thank-you-page-meta-pixel.md` (implemented: `Purchase` tracking added
directly to `PaymentReturnPage.tsx` and `BoostPaymentReturnPage.tsx`, no new route — see
[2026-09-16-thank-you-page-meta-pixel-design.md](2026-09-16-thank-you-page-meta-pixel-design.md))
and `feature-thank-you-page-meta-pixel-quick-access.md`-style nav tracking (implemented:
`trackQuickAccessClick` + stable nav ids in `PublicLayout.tsx`).

The client has since made two further, related requests, captured in
`reconcile-thank-you-page-and-button-tracking.md`:

1. A single, dedicated **Thank You Page URL** the client can point at, covering Test Series,
   Courses, E-Store, and a new **Free Courses** flow — without weakening or duplicating the
   already-correct verification/Pixel-firing logic on the existing return pages.
2. Meta's Event Setup Tool still reports untracked buttons beyond the nav — homepage CTAs and
   "Enroll Now" buttons need the same stable-id + explicit-tracking treatment.

### Investigation findings (before design)

- **Paid Course enrollment already fires `Purchase` correctly, today.**
  `EnrollmentModal.tsx`'s `handlePay` calls `startCashfreeCheckout({ orderType: "course",
  courseId })`, which lands on `/payments/return` — the exact same page and verification path
  already instrumented with `trackPurchaseOnce` for E-Store/Test Series. No new tracking logic is
  needed for paid Courses; only the redirect wiring in this design applies to it.
- **"Free Courses" does not exist anywhere in the codebase or schema.** The only "free" concept
  present is `is_free_preview` on individual lessons within an otherwise-paid course. There is no
  `price = 0` branch anywhere, no separate free-enrollment path. Confirmed with stakeholder:
  "Free Courses" means existing/future courses priced at ₹0, using the existing `courses` table —
  not a new content type.

## Design

### A. `/thank-you` route — presentational only, no verification, no Pixel firing

New page `src/pages/ThankYouPage.tsx` at `/thank-you`. It performs **no order verification and
fires no Meta Pixel event itself** — that responsibility stays exactly where it already correctly
lives (on `PaymentReturnPage.tsx` / `BoostPaymentReturnPage.tsx` / the new Free Courses branch in
`EnrollmentModal.tsx`). This is the key move that satisfies "one URL for the client" without
duplicating or weakening the verification logic the earlier design deliberately protected.

It reads its data from **React Router navigation state** (`useLocation().state`), not URL query
params:

```ts
type ThankYouState = {
  type: "e_store" | "test_series" | "course" | "boost";
  status: "paid" | "free" | "failed" | "cancelled" | "pending" | "error";
  title?: string;        // item/course/registration name, for the summary
  amount?: number;       // for paid states
  admitCardNumber?: string; // BOOST only
};
```

Router state cannot be crafted into a shareable link or survive a page refresh/direct visit —
only an in-app `navigate(path, { state })` call carries it. If `/thank-you` is opened directly
(bookmark, refresh, hand-typed URL) with no state present, it renders an honest fallback: "Looking
for an order confirmation? Check My Orders / My Courses," never a fabricated success screen. This
was chosen deliberately over trusting a `?status=paid` query param, which would be trivially
spoofable — even though the cosmetic-only risk of a spoofed param is low (no real order or Pixel
state is affected either way), router state is simple to implement and closes the gap entirely.

`type` also rides along in the URL (`/thank-you?type=course`) purely for readability/support
purposes — it is not trusted for anything, since the actual page content comes from state.

**Wiring:**
- `PaymentReturnPage.tsx`: after its existing `verify()` effect resolves to a terminal status
  (`paid`/`failed`/`cancelled`/`error`) and fires `trackPurchaseOnce` exactly as it does today, it
  calls `navigate("/thank-you?type=<order_type>", { replace: true, state: {...} })` instead of
  rendering its own summary inline. The "Verifying payment…" loading UI stays exactly as-is,
  shown before the redirect.
- `BoostPaymentReturnPage.tsx`: same pattern, once polling reaches `paid`/`failed` or exhausts its
  6 attempts at `pending`. Loading/polling UI is untouched.
- `order_type` for `PaymentReturnPage` is derived from `order_items.item_type` (already returned
  by `cashfree-verify-order`'s response) — `"cart"` → `e_store`, `"course"` → `course`,
  `"test_series"` → `test_series`.

### B. Free Courses (price = 0) — new flow

In `EnrollmentModal.tsx`'s `handlePay`: if `coursePrice === 0`, skip Cashfree entirely. Insert the
`enrollments` row directly (same shape as the existing `handleStaffDemoEnroll` path — no Cashfree
order, no payment), then call `trackCompleteRegistrationOnce` and `navigate("/thank-you?type=course",
{ state: { type: "course", status: "free", title: courseName } })`.

`CourseDetailPage.tsx` and `CoursesPage.tsx` need zero changes — they already call the same
`EnrollmentModal`, so the price=0 branch is transparent to both call sites.

### C. Paid Course confirmation — no new tracking logic

Already covered by the existing `PaymentReturnPage.tsx` + `trackPurchaseOnce` (see Investigation
findings above). Only Section A's redirect-to-`/thank-you` wiring applies here.

### D. Button tracking expansion

Two distinct treatments, matching the split between "browsing intent" and "checkout intent":

**D1. Browsing/nav-style CTAs** — stable `id` + a new `trackCtaClick(id)` custom event (same
mechanism as the existing `trackQuickAccessClick`, generalized to cover buttons outside the main
nav):
- `LandingPage.tsx` (homepage): hero "Explore Courses" (`id="cta-explore-courses"`) and "Enquire
  Now" (`id="cta-enquire-now"`), BOOST section "Explore Now" (`id="cta-boost-explore"`), Centres
  section "Find a Centre" (`id="cta-find-centre"`).
- "Enroll Now" *trigger* buttons that only open a modal (no payment started yet): `CourseDetailPage.tsx`
  (`id="cta-enroll-course-detail"`), `CoursesPage.tsx` listing cards (`id="cta-enroll-{slug}"` — one
  per card, still a stable, non-hashed pattern), `TestSeriesDetailPage.tsx` (`id="cta-enroll-test-series"`).

**D2. Checkout-initiation** — Meta's standard `InitiateCheckout` event, fired at the moment a real
payment attempt begins (immediately before the Cashfree call), not at the outer "Enroll Now"
click:
- `EnrollmentModal.tsx` `handlePay`, before `startCashfreeCheckout` (paid courses only — the
  Free Courses branch in Section B fires `CompleteRegistration` instead, never `InitiateCheckout`).
- `TestSeriesRegistrationModal.tsx` `onSubmit`, before `openCashfreeCheckout`.
- `BoostRegistrationModal.tsx` `onSubmit`, before `startBoostCashfreeCheckout`.

No dedupe guard on `InitiateCheckout` — it is expected to fire every time a checkout attempt
starts, including retries after a failed/abandoned payment. This matches Meta's own standard
event semantics.

### E. Dedupe utility generalization

`trackPurchaseOnce` in `src/lib/metaPixel.ts` becomes a thin wrapper over a generalized
`trackConversionOnce(eventName, dedupeKey, data)` (same `localStorage` guard mechanism, unchanged
key format). `trackCompleteRegistrationOnce(dedupeKey, data)` is added as a second thin wrapper
over the same function, for the Free Courses flow in Section B. One guard implementation, no
duplicated dedupe logic — existing call sites (`PaymentReturnPage.tsx`, `BoostPaymentReturnPage.tsx`)
keep calling `trackPurchaseOnce` unchanged.

### Out of scope

- No changes to any edge function or backend verification logic — this design is entirely
  frontend (new page + redirect wiring + new tracking call sites).
- No re-verification of order/registration status on `/thank-you` itself — by design (Section A).
- No changes to `CourseEnquiryDialog.tsx`'s anonymous-user enquiry flow — it doesn't reach a
  checkout step immediately (it redirects to `/login` first), so `InitiateCheckout` doesn't fit
  there; out of scope for this ticket.

## Testing / verification plan

- `npx tsc --noEmit` and `npm run build` after implementation, plus a re-check that the existing
  E-Store/Test Series/BOOST `Purchase` tracking (already deployed) is not broken or duplicated by
  the redirect wiring.
- **Cannot** be verified end-to-end from this environment: no browser to click through a real/sandbox
  Cashfree payment or a Free Course enrollment to `/thank-you`, and no Meta Events Manager/Event
  Setup Tool access to confirm `InitiateCheckout`/`CompleteRegistration` land correctly or that the
  new buttons are now detected. This needs real post-deployment verification, same limitation
  noted on every prior Pixel task in this project.

## Deliverable

- One `/thank-you` route rendering a consistent confirmation experience for Test Series, Courses
  (paid and free), E-Store, and BOOST — fed by router state from the pages that already correctly
  verify and track each flow.
- Free Courses (price = 0) enrollment implemented for the first time, firing `CompleteRegistration`.
- Paid Course `Purchase` tracking confirmed as already-covered, wired into the new redirect.
- Stable ids + `trackCtaClick` on homepage/detail-page browsing CTAs; `InitiateCheckout` fired at
  the real checkout-start moment across all three payment flows.
- `trackPurchaseOnce`/`trackCompleteRegistrationOnce` unified on one generalized dedupe utility.
