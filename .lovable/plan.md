# Plan: Result Colors, Submit Flow & CBT Login Redesign

## 1. Individual Student Result PDF — Correct = Green, Wrong = Red
**File:** `src/pages/AdminTestResultPage.tsx`

In the per-question breakdown rendered in the student detail view (and downloaded PDF), the status badge / answer text currently uses red for both Correct and Wrong.

- For each question row, derive `isCorrect` from `metadata.questions[].is_correct`.
- Status badge & "Correct"/"Wrong" label:
  - Correct → `bg-green-100 text-green-700 border-green-300`
  - Wrong → `bg-red-100 text-red-700 border-red-300`
  - Unattempted → `bg-gray-100 text-gray-600 border-gray-300`
- Marks number colour mirrors the same (green for +ve, red for -ve, gray for 0).
- Same tokens used in the html-to-pdf renderer so the downloaded PDF matches the on-screen view.

## 2. Submit Confirmation Dialog (Test Taking)
**File:** `src/pages/TestTakingPage.tsx`

- On clicking "Submit Test" (manual submit), do NOT immediately call `handleSubmit`. Open an `AlertDialog`:
  - Title: "Submit your test?"
  - Description: shows quick stats — Attempted X / Total Y, Unattempted Z, Marked for review M.
  - Buttons: **"Go back to test"** (cancel) | **"Yes, submit now"** (confirm → runs existing `handleSubmit(false)`).
- Auto-submits (timer expiry, 3rd tab-switch) BYPASS this dialog.

## 3. Submission Success Popup
**File:** `src/pages/TestTakingPage.tsx` (and/or `TestResultPage.tsx` entry)

- After successful submission, show a centered modal (cannot be dismissed by outside click):
  - Large animated green circle with a white check (`lucide-react` `CheckCircle2` + `animate-in zoom-in`).
  - Heading: "Your exam has been submitted successfully"
  - Body: "Your result will be announced by the Bansal Team soon. Best of luck!"
  - Single button: "Continue" → navigates to `/cbt/submitted` (or dashboard for non-CBT).
- Replaces the current silent redirect-on-submit.

## 4. CBT Login Page Redesign — Bansal Branded
**File:** `src/pages/CbtLoginPage.tsx`

Convert from the plain card into a warm, branded full-screen layout:

```text
+--------------------------------------------------+
|  [Left Panel — Navy gradient, grid texture]      |
|    BansalLogo (white)                            |
|    "Best of luck, Beta."                         |
|    "The blessings of the entire Bansal           |
|     family are with you today."                  |
|    — Bansal Classes, Kota                        |
|    [small decor: orange flame accent]            |
|                                                  |
|  [Right Panel — White card]                      |
|    Chip: CBT Kiosk · Secure Sign-In              |
|    Heading: Sign in to your test                 |
|    Roll Number input                             |
|    Mobile Number input                           |
|    [Orange "Begin Test" button]                  |
|    Tiny line: agree to test rules                |
+--------------------------------------------------+
```

- Use existing `BansalLogo`, `BansalButton` (`variant="cta"`), `bansal-orange`, `bansal-blue-dark` tokens — no hardcoded colours.
- Mobile: stack left panel on top as a compact hero band (logo + blessing line).
- Add subtle `Sparkles` / `Flame` icon accents; keep typography in `font-display`.
- Inputs get focus ring in `bansal-blue` and a small lock icon prefix.
- No logic changes — same `cbt-login` edge-function flow.

## Out of scope
- No DB migration. No scoring logic change. No changes to the tab-switch warning behaviour added previously.