
# Bansal Classes — Full Site Build Plan

Scope is large. Splitting into **5 phases**. Each phase is independently shippable. After approval I'll execute Phase 1 first, then check in.

---

## Phase 1 — Global Shell + Homepage (fix what's broken now)

**Problem on screen**: header logo/menu and footer not rendering on `/courses` (and likely other public pages). Root cause: `PublicLayout` is not wrapping all public routes, or nav is hidden at current breakpoint.

- Fix `PublicLayout`: brand logo (image + text fallback), top utility bar (phone numbers, "Student Login"), main nav: **Home · About · Courses · Test Series · Centers · Career · E-Store · Contact · BOOST**, mobile drawer, sticky on scroll.
- Footer: 4 columns — Company / Quick Links / Stay Connected (Kota HQ address, admission phones `+91 9773343246, +91 8003045222`, HR `+91 8375015384`, BFTP `+91 8003046222`) / Social. Copyright bar.
- Wrap **every** public route in `App.tsx` with `PublicLayout` (Home, About, Courses, Course Detail, Test Series, Centers, Career, Contact, BOOST, Achievements, Store, Privacy, Terms, Refund, Disclaimer, Leadership subpages).
- Homepage content pass: hero, stats (Daily Live / 10M+ / 24×7 / 100+), "Explore Ideal Course" (JEE / Pre-Foundation / NEET cards), free materials strip, Why Bansal, course explorer tabs, test series tabs, centers carousel (Kota, Aligarh, Akola, Amravati, Amritsar, Baramulla, Anantnag, Ahmednagar… +scroll), CLP vs DLP, testimonials, app coming-soon, footer.

---

## Phase 2 — Content Pages (About + Leadership + Career + Legal)

- `/about` — History, Teaching Methodology, stats, Vision, Mission, Leadership grid (3 cards linking to subpages).
- `/about/vk-bansal` — "Forever Honored" — full bio, Guiding Teachers / Disciplinary Atmosphere / Setting High Standards / Building a Legacy blocks, quote, "From Lantern to Lighthouse".
- `/about/sameer-bansal` — MD & CEO profile, philosophy, recognition.
- `/about/mahima-bansal` — Director & Academic Mentor profile.
- `/about/neelam-bansal` — Co-founder & Matriarch profile.
- `/career` — BFTP banner, positions (Senior Academic / NEEV VI–X / Non-Academic), online application form → `career_applications` table.
- `/privacy-policy`, `/terms`, `/refund-policy`, `/disclaimer` — standard templates with Bansal branding.
- FAQ accordion component reused on Home + About.

---

## Phase 3 — Courses, Test Series, Store (catalog + detail + cart)

**Data model** (new migrations):
- `courses`: extend existing — add `category` (`jee` | `neet` | `pre_foundation`), `mode` (`offline` | `online` | `residential`), `class_level` (`6`..`12`, `dropper`), `batch_code` (BULL'S EYE / NUCLEUS / STERLING / NEEV / ZENITH…), `target_year`, `price`, `original_price`, `discount_percent`, `duration_label`, `is_free`.
- `books` (new): title, subject, class_level, price, cover_url, stock.
- `test_series` (new): title, exam (jee/neet), class_level, num_tests, price, description.
- `test_series_tests` (new): FK to test_series + tests table; each test has N questions (reuses existing question bank).
- `orders` + `order_items` (new): unified for course/book/test-series purchases.
- Seed: all courses listed in the brief (BULL'S EYE/NUCLEUS/STERLING for JEE & NEET in offline + online + free; NEEV VI–X pre-foundation; ONLINE X CBSE).

**Pages**:
- `/courses` — filter by category tab (JEE/NEET/Pre-Foundation), mode chip (Offline/Online/Residential), class chip. Card shows title, batch, class, price + strike-through + % off, "View".
- `/courses/:slug` — banner, batch/class/target/duration, what's included, syllabus, faculty strip, fee breakdown, enroll CTA → Enquiry modal OR pay flow.
- `/test-series` — JEE / NEET tabs, cards, detail page.
- `/store` — books listing + detail.
- Unified `/checkout` placeholder (mock pay; Razorpay wiring later).

---

## Phase 4 — Centers (multi-tenant by subdomain)

- `centers` table: slug, name, city, state, address, phones, email, hero_image, manager_user_id, is_active. Seed 85+ centers (Kota HQ as default + cities from brief).
- `/centers` directory with city search + map preview.
- `/centers/:slug` — banner, offered courses (filtered by center), faculty, contact, enquiry form → `enquiries` with `center_id`.
- **Subdomain routing**: Vite host-based detection — `aligarh.bansal.example` resolves to `/centers/aligarh` content (fallback to path for local dev).
- **Center admin role** (`center_admin`) — sees only their center's enquiries, courses, students. Super admin (Kota) sees everything.

---

## Phase 5 — Student Portal + Admin

**Student** `/student/*`:
- `My Courses` → enrolled list → course → **Chapters → Topics → Materials (PDF / Video / Quiz)**.
- `Live Classes` (scheduled by admin), `Live Tests`, `My Progress` (computed: lecture-watch %, quiz score avg, test attempts).
- `My Profile` (editable), `My Purchases` (courses + books + test series unified from `orders`).

**Admin** `/admin/*` (extend existing):
- Courses CRUD with chapters→topics→materials tree.
- Books CRUD, Test Series CRUD (with question picker from question bank).
- Centers CRUD + assign center admins.
- Enquiries inbox (filter by center).
- Career applications inbox.
- Orders / payments view.

---

## Technical Notes

- Pure frontend uses HSL semantic tokens (already established: `bansal-orange`, `bansal-blue`, `bansal-blue-dark`, `bansal-gray`, etc.). No raw hex.
- All new public copy lives in `src/content/bansal/*.ts` so it's easy to edit.
- New images via `imagegen` (faculty placeholders, center hero, app mockup already exist).
- Routing: keep React Router; subdomain hook reads `window.location.hostname`.
- Migrations follow GRANT → RLS → POLICY discipline. Center scoping uses `has_role` + center_id check.

---

## Proposed execution order

1. **Phase 1 now** (header/footer/home fix + content) — this is what's visibly broken. ~1 build cycle.
2. Phase 2 (About + leadership + career + legal).
3. Phase 3 (catalog + seeding all courses).
4. Phase 4 (centers + subdomain).
5. Phase 5 (student portal deepening + admin extensions).

Reply **"approved"** to start Phase 1, or tell me which phase to do first / what to drop.
