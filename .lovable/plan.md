# Redesign Course Detail Page

Restructure `src/pages/CourseDetailPage.tsx` to match the reference layout (Bansal "Bull's Eye" detail) while keeping our locked design tokens (orange primary, navy, Mulish/Plus Jakarta, rounded-2xl cards, Lucide icons).

## New page structure

Two-column layout on desktop (`grid-cols-[1fr_360px]`), single-column stacked on mobile. Sticky right rail on `lg+`.

### Top bar (above title)
- Mode badge (e.g. `Offline` with video icon) + Category chip (e.g. `Category: JEE`) — pill row, brand colors.

### Left column
1. **Title + intro paragraph** — large H1, muted intro copy.
2. **Subjects Covered** — chip row (Physics, Chemistry, Maths) from `course.subject` (comma-split).
3. **This Course Includes** — 2–4 mini cards (Education Level, Duration, Mode, Language) in a responsive grid.
4. **Know Your Teachers** — horizontal card row with avatar / name / subject / years badge. Pulls from a new optional `teachers` field on the course (fallback to single `educator_name`).
5. **Know More Details** — rich-text block rendering structured key/value rows (Course Name, Eligibility, Mode, Location, Target Exam, Admission Process, Fee Structure with installments) + "Why Choose…" bulleted list.
6. **Class Commencement Dates** — styled responsive table (cards on mobile).
7. **Scholarship sections** — two collapsible/expandable tables: Board performance, Olympiads.
8. **What You'll Learn / Requirements / Reviews** — kept from existing page, moved below.

### Right column (sticky)
1. **Course banner image card** — full thumbnail with rounded top, brand-colored frame.
2. **Price block** — strike-through original price, current price, % OFF badge.
3. **Payment Details mini-table** — Price, Coupon Discount, Total Payable.
4. **Pay Now CTA** — full-width orange gradient button with amount.
5. **View Coupon Code** link.
6. **Trust strip** — payment provider icons (Lucide `CreditCard`, plus inline SVG for VISA/MC/UPI placeholders) + "Safe and secure payment" line.
7. **Our Services card** — 3×3 icon grid (Study Material, Recorded Lectures, Test Series, Doubt Classes, T-Shirt, Umbrella, Bag) using Lucide icons.

### Removed / merged
- Existing 5-tab nav (About / Lectures / Tests / PDFs / Time) is **removed** for non-enrolled users — replaced by the new sectioned long-form layout that matches the reference.
- For **enrolled** users, a single "Continue Learning" panel appears at the top of the left column with progress + curriculum accordion (kept from current Lectures tab).

## Data handling

- All new sections read from `course` fields when present; otherwise show sensible defaults derived from existing values (`subject`, `educator_name`, `duration_hours`, `target_exam`, `price`, `original_price`).
- Teachers, commencement dates, and scholarship tables fall back to a static demo dataset (Bansal-styled names: Vikram Thapar, Ananya Iyer, Siddharth Nair, Kavitha Menon per project memory) when course-specific data is absent. No DB schema changes.

## Styling

- Cards: `rounded-2xl border border-border bg-card`, soft shadows.
- Section headers: small uppercase eyebrow + bold display heading.
- Mode/category badges: orange + navy pill chips.
- Tables: zebra rows, rounded outer border, horizontal scroll on mobile.
- "Our Services" icons: square tiles `bg-primary/10`, Lucide icon centered, label below.
- Fully responsive: right rail stacks under content on `<lg`, two-column comparisons collapse, tables become stacked cards on `sm`.

## Files

- `src/pages/CourseDetailPage.tsx` — main rewrite of JSX (logic, hooks, enrollment flow unchanged).
- No new components, no DB migrations, no new dependencies.