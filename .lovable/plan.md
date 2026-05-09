# Phased Implementation Plan (Payments Skipped)

Each phase is independently shippable. Phases 1–2 require no migrations.

---

## Phase 1 — Quick wins (no DB changes) ✅ IN PROGRESS

1. **Time-aware greeting** on Student Dashboard (Good morning/afternoon/evening).
2. **"Talk to Counsellor"** CTA → links to `/contact`.
3. **Centralise SUBJECTS** in `src/lib/constants.ts`; replace 6 duplicated lists.
4. **CoursesPage filters** — use `useExams()` for goal filters instead of hardcoded list.
5. **EducatorsPage** — fetch real teachers from `profiles` + `user_roles` (role=`teacher`); fallback to curated list only if empty.
6. **StorePage** — replace static 6-course array with `useCourses()` (link to `/courses/:slug`).

## Phase 2 — Mentor portal real KPIs (no DB changes)

7. MentorDashboard tiles fed by real data: assigned students, unread chat count, avg progress, open doubts from assigned students.
8. Add small "students at risk" list (low progress / no activity 7d).

## Phase 3 — Doubt status visible to student (small migration)

9. Surface educator-routed doubt timeline on `/doubts`: show "Awaiting educator", "Assigned to <name>", "Answered".
10. Make `DoubtCard` show responder role + name when educator answers.

## Phase 4 — Admin: invite + audit trail

11. Admin **invite flow**: edge function + dialog to email a magic-link signup with role pre-assigned.
12. **Admin Reports**: notify reporter on status change (already covered by trigger — verify + add UI badge), add `report_audit` rows when status changes.
13. **Bulk announcement** delivery: wire admin composer to `notifications` table fan-out via RPC/edge.

## Phase 5 — Force-change-password admin trigger

14. Admin Users page action: "Require password reset" → sets `must_change_password=true` on profile; `ForceChangePasswordPage` already enforces.

## Phase 6 — Site content / marketing CMS

15. Create `site_content` table (`key`, `payload jsonb`, `updated_by`, RLS: anyone read, admin write).
16. Migrate FAQs (Landing, Pricing), AboutPage stats, Tests/LiveClasses landing copy, Mentorship steps, Admissions tiers, Career openings, Association partners.
17. Admin "Site Content" page to edit JSON blocks.

## Phase 7 — Marketing page polish

18. Replace remaining curated arrays (highlights, builders) with `site_content` once table is in.

---

## Skipped (payment-dependent)

- StorePage checkout, CourseDetail enrol payment, PricingPage subscriptions, ProfilePage subscription panel, AdminPaymentsPage gateway integration, Plan entitlement gating.
