# E-Store: Books + Module Bundles with Cart & Razorpay Checkout

The `/e-store` page and `books` table already exist (6 books, currently with a placeholder "Buy Now" that just inserts a pending order). This plan turns it into a real store with module bundles, a cart, and real Razorpay payments — managed from one admin page.

## What you'll get

1. **E-Store landing (`/e-store`)** with two tabs: **Books** and **Module Packs**, plus existing filters (Exam, Class) and search.
2. **Module Packs** = curated bundles of existing books sold at a combined discounted price (e.g. "Class 11 JEE Foundation Pack — 4 books, ₹1,999 instead of ₹2,800").
3. **Pack detail page (`/e-store/pack/:slug`)** showing what's inside, total savings, and Add to Cart.
4. **Cart drawer** (icon in header on e-store pages) — add/remove items, quantity, live total.
5. **Checkout page (`/e-store/checkout`)** — shipping address form + Razorpay payment.
6. **My Orders (`/orders`)** — student sees their purchases and statuses.
7. **Admin → Books page becomes Admin → Store** with a top toggle **Book / Module Pack** — both managed in one place.
8. **Nav link**: Add "E-Store" to the public header so people can actually find it.

## Database changes

- New table **`module_packs`**: `id, slug, title, description, cover_url, target_exam, class_level, price, original_price, is_published, sort_order, timestamps`.
- New table **`module_pack_items`**: `pack_id, book_id, position` (which books make up each pack).
- New table **`orders`** (replace the existing thin one) with: `user_id, status (pending/paid/failed/shipped/delivered), subtotal, shipping_fee, total, currency, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_pincode, razorpay_order_id, razorpay_payment_id, razorpay_signature`.
- New table **`order_items`**: `order_id, item_type ('book'|'pack'), item_id, item_title, unit_price, quantity`.
- RLS: users see/insert only their own orders; admin/super_admin see all. Packs are publicly readable when published; only admins write.

## Razorpay integration

- Two new edge functions:
  - `razorpay-create-order` — authenticated; takes cart, validates prices from DB, creates Razorpay order, persists `orders` + `order_items` as `pending`.
  - `razorpay-verify-payment` — verifies HMAC signature, marks order `paid`, decrements `books.stock` for purchased books (and books inside packs).
- Secrets required (we'll request them after you approve): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. The public key id is also exposed to the client for the checkout widget.

## Frontend changes

- `src/hooks/useModulePacks.ts` (new), extend `useBooks.ts` as is.
- `src/store/useAppStore.ts` — add cart slice (items, add/remove/clear, persisted to localStorage).
- `src/pages/EStorePage.tsx` — add Books/Packs tabs, cart button.
- `src/pages/PackDetailPage.tsx` (new), `src/pages/CheckoutPage.tsx` (new), `src/pages/OrdersPage.tsx` (new).
- `src/components/CartDrawer.tsx` (new).
- `src/pages/AdminBooksPage.tsx` → renamed UX to **AdminStorePage** with Book / Pack toggle (route stays `/admin/books`, plus a tab for packs). Pack editor lets you pick existing books and set a combo price.
- `src/components/PublicLayout.tsx` — add "E-Store" nav link.
- Routes added in `src/App.tsx`.

## Out of scope (ask later if needed)

- Coupons / promo codes.
- Multi-address book per user.
- Refund flow from UI (admin can still mark orders refunded in DB).
- Dubai region / AED — Razorpay is India only for this pass.

## Approve to proceed

After you approve, the first build step will request the two Razorpay secrets — please have them ready from your Razorpay dashboard (Settings → API Keys).
