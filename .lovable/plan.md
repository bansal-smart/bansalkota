## Plan: "Career with Arambh" Section + Educator Application Form

### Overview

Add a new "Career with Arambh" section to the landing page with a "Join Us" CTA. Clicking opens a multi-field application form in a modal/dialog. On submit, the educator is "registered" (mock), shown a success toast, and redirected to `/teacher/dashboard`.

Since no backend/auth is wired up yet, this will be a **frontend-only mock flow** (form data logged + stored in `useAppStore` / localStorage). When Lovable Cloud is connected later, we can persist to a real DB and storage bucket.

### 1. New Section on Landing Page

**File:** `src/pages/LandingPage.tsx`

Add a new section "Career with Arambh" between "Meet Our Educators" and "Student Success Stories":

- Eye-catching gradient background (orange → navy) matching theme
- Heading: "Career with Arambh"
- Subtext: "Join India & Dubai's fastest-growing edtech platform. Teach thousands, earn well, work flexibly."
- 3 perk cards: Flexible Hours, Competitive Pay, Reach 50,000+ Students
- Large "Join Us" button → opens the application dialog

### 2. New Component: Educator Application Form

**File (new):** `src/components/EducatorApplicationDialog.tsx`

A `Dialog` containing a scrollable form with these fields:


| Field                       | Type                                                                 | Required |
| --------------------------- | -------------------------------------------------------------------- | -------- |
| Candidate Name              | text                                                                 | ✅        |
| Email                       | email                                                                | ✅        |
| Date of Birth               | date picker                                                          | ✅        |
| Contact No                  | tel                                                                  | ✅        |
| Alternative Contact No      | tel                                                                  | optional |
| Subject                     | Select dropdown (Physics, Chemistry, Maths, Biology, English, Other) | ✅        |
| Highest Qualification       | text                                                                 | ✅        |
| Other Qualification         | text                                                                 | optional |
| Current Organization        | text                                                                 | optional |
| Previous Organization       | text                                                                 | optional |
| Total Experience (years)    | number                                                               | ✅        |
| Current CTC (per month, ₹)  | number                                                               | optional |
| Expected CTC (per month, ₹) | number                                                               | ✅        |
| Photo Upload                | file (image)                                                         | ✅        |
| Resume Upload               | file (PDF/DOC)                                                       | ✅        |
| Demo Video Link             | URL                                                                  | ✅        |


**Validation:** `react-hook-form` + `zod` schema with proper messages. Files validated for type and size (Photo ≤ 2MB image, Resume ≤ 5MB PDF/DOC, Video link must be valid URL).

**On Submit:**

1. Validate all required fields
2. Show success toast: "Welcome to Arambh! Your educator account is ready."
3. Save educator profile to `useAppStore` (mock auth as teacher)
4. Navigate to `/teacher/dashboard`

### 3. Store Update

**File:** `src/store/useAppStore.ts`

Add a minimal `currentEducator` slice + `registerEducator(data)` action that stores the form data (excluding raw files — store filenames only) in state and localStorage.

### 4. Files to Modify / Create


| File                                           | Action                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| `src/pages/LandingPage.tsx`                    | Add "Career with Arambh" section + dialog trigger |
| `src/components/EducatorApplicationDialog.tsx` | **NEW** — form modal                              |
| `src/store/useAppStore.ts`                     | Add educator registration slice                   |


### Notes

- Files are not actually uploaded to storage in this mock — only filenames captured. When Lovable Cloud is enabled, we'll wire to a `educator-uploads` bucket and an `educator_applications` table.
- Form uses existing shadcn `Dialog`, `Form`, `Input`, `Select`, `Calendar`, `Button` components — consistent with the rest of the app.
- Date picker will use the shadcn `Calendar` inside a `Popover` per project conventions.
- User wants you to connect it to lovable cloud for proper data storage and smooth workflow.