# 1. HQ / franchise content-scope model

- Status: Accepted
- Date: 2026-07-06

## Context

Bansal Classes is moving from a single-operator platform to a **franchise network**:
independent operators run their own **centres**, while the original **Kota** centre
becomes **HQ** (`centres.is_hq = true`). All pre-existing data (students, courses,
tests, test series, batches) was global/un-scoped and implicitly Kota's.

We needed a content model that supports three realities at once:

1. HQ sells **online courses to everyone** (a national storefront).
2. HQ may publish **standardised national tests / series / courses** that every
   franchise's students should also receive.
3. Each franchise (and Kota itself) runs **local content** for its own students only,
   invisible to other centres.

And two structural mismatches with the old schema:

- A `course_batches` row belonged to a single `course_id`, but franchises think of a
  batch as a **stream+class cohort** (e.g. `XI-J` = JEE Class 11) independent of any one
  course.
- Kota must remain an **exception** to almost every franchise rule (owns legacy data,
  keeps manual roll numbers, is the only centre allowed to create online/global
  content).

## Decision

- Every content type is **owned by a centre** via `centre_id`; pre-existing data is
  backfilled to Kota (nothing deleted).
- Content visibility uses **`centre_id` + an opt-in `is_global` flag** on `courses`,
  `tests`, and `test_series`:
  - `is_global = true` → visible to **all** franchise students (HQ-authored shared
    content).
  - `is_global = false` → **centre-local** (only that centre's students).
  - **Online courses are always global** and are the only courses sold in the public
    e-store; franchise courses are offline-only, centre-local, and **assigned** (never
    sold online).
- A **batch is decoupled from courses**: `course_batches` becomes `(centre_id, stream,
  class, code)` with `course_id` nullable. Each franchise centre auto-gets one batch per
  stream×class; Kota keeps its legacy course-linked batches.
- **Kota HQ is special-cased** across the system (data ownership, manual roll numbers,
  sole online/global authoring right) rather than modelled as "just another centre with
  extra permissions".

## Consequences

- `courses`/`tests`/`test_series` carry **both** `centre_id` and `is_global` — a future
  reader must understand these are orthogonal (owner vs reach), not redundant.
- Visibility queries and RLS everywhere must filter by
  `is_global OR centre_id = <student's centre>`; forgetting the `is_global` half silently
  hides HQ national content, forgetting `centre_id` silently leaks local content.
- The `is_hq` exception branches recur (roll numbers, batch auto-creation, content
  authoring) — deliberately concentrated behind that flag so the specialness is
  greppable.
- Decoupling batches from courses means enrollment-into-a-course is now a separate step
  from batch membership; the old "auto-enroll via the batch's course" path only applies
  to Kota's legacy course-linked batches.

## Alternatives considered

- **Only online courses are global; everything else HQ makes is Kota-local.** Simpler
  (no `is_global` on tests/series) but blocks HQ from ever pushing standardised national
  test series to franchises — a stated requirement.
- **All HQ content is global by default.** Removes the flag but forces every Kota-local
  practice test onto every franchise student; no way to keep HQ-internal content
  private.
- **Model Kota as a normal centre with extra role permissions** instead of an `is_hq`
  exception. Cleaner conceptually, but the differences (owns all legacy data, manual
  vs auto roll numbers, online-authoring monopoly) are structural, not
  permission-shaped, and would leak `is_hq`-style conditionals anyway with less clarity.
- **Keep batches tied to a course.** Preserves the existing auto-enroll path but can't
  represent a franchise's single `XI-J` cohort that spans multiple courses / no course.
