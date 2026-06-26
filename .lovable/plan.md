## 1. Remove "NTSE" globally

Strip the word "NTSE" (and "NTSE / Olympiads" / "NTSE, KVPY, ...") from all user-facing copy:

- `src/pages/CenterDetailPage.tsx` — Foundation program desc.
- `src/pages/BoostPage.tsx` — target row + FAQ answer.
- `src/components/BoostRegistrationModal.tsx` — `EXAMS` list (drop "NTSE").
- `src/pages/AdminBooksPage.tsx` — `TARGET_EXAMS` list (replace "NTSE / Olympiads" → "Olympiads").
- `src/pages/AdminToppersPage.tsx` — placeholder text.

Replacements keep surrounding items intact (e.g. "Olympiads, JEE, NEET").

## 2. Centres count "Showing 85 of 78"

`src/pages/CentersPage.tsx` line 71 still uses a static `CENTER_COUNT - 1` from `@/data/centres` (the legacy 88-entry file). Fix:

- Drive the hero stat (`{CENTER_COUNT}+ Centres`) and the subheading number from `CENTERS.length` (already done for the chip).
- Replace `STATE_COUNT` import with a derived unique-state count from the live `CENTERS` array so deleting centres updates state count too.
- Line 121 "Showing X of Y" already uses live count — verify no stale source remains.

## 3. Remove floating "S" dropcap

`src/pages/LeadershipDetailPage.tsx` line 211 uses Tailwind `first-letter:*` utilities to render the oversized orange "S". Remove those utility classes so the paragraph is plain body text.

## 4. Globalize Class dropdown (Class 6 → Dropper)

Create a shared constant `CLASS_LEVELS = ["Class 6", … "Class 12", "Dropper"]` in `src/lib/constants.ts` and use it everywhere a class picker exists:

- `src/components/CourseEnquiryDialog.tsx` (already 6→Dropper, switch to shared constant)
- `src/components/CenterOfflineSections.tsx` (currently starts at Class 8 — this is the Admission Enquiry modal in the screenshot)
- `src/components/landing/LandingCTAForm.tsx` (currently "Class 6-8" grouped — replace with individual 6..Dropper)
- `src/components/landing/LeadForm.tsx` (uses Dropper variants — normalize to shared list)
- `src/components/BoostRegistrationModal.tsx`, `src/components/ProfileCompletionDialog.tsx`, `src/pages/SignupPage.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/AdmissionsPage.tsx`, `src/pages/AdminStudentsPage.tsx`, `src/pages/AdminBatchesPage.tsx`, `src/pages/CenterStudentsPage.tsx` — audit each and align to the shared list where the field represents the student's class.

## 5. Editable centre facilities + stat cards

Currently `FACILITIES` array and the two stat cards ("Students mentored", "Selections (2024)") are hard-coded in `CenterDetailPage.tsx`. Make them per-centre and editable from admin.

### Schema (migration)

Add to `public.centres`:
- `facilities text[] not null default '{}'` — chips shown under Centre details.
- `students_mentored text` — e.g. "10,000+".
- `students_mentored_note text` — e.g. "Across Bansal network".
- `selections_count text` — e.g. "2,500+".
- `selections_year integer` — e.g. 2024 (drives card title "Selections (2024)").
- `selections_note text` — e.g. "JEE & NEET combined".

### Admin (`src/pages/AdminCentersPage.tsx`)

In the create/edit centre modal add:
- A chip input (or comma-separated text → array) for `facilities` with suggestions: AC classrooms, Doubt clinics, Library & reading hall, Mock test infrastructure, Mentor support, Parent-teacher meets, In-house CBT.
- Inputs for `students_mentored`, `students_mentored_note`, `selections_count`, `selections_year`, `selections_note`.

### Frontend (`src/pages/CenterDetailPage.tsx`)

- Read the new fields from the centre row (extend `DBCenter` in `src/hooks/useCenters.ts`).
- Render facility chips from `center.facilities`; hide the section if the array is empty.
- Stat cards use the centre's own numbers; fall back to current defaults only when unset.

## Out of scope

No changes to courses, books storefront, or other admin pages beyond the small NTSE label tweaks listed above.
