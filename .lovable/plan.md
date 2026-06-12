# Implementation Plan

## What I’ll build

### 1) Centre login + proper centre admin panel
- Keep the existing `/center` portal as the base and upgrade it into the real centre admin workspace.
- Use **admin-created credentials** for centre admins.
- Make centre admins able to fully manage the phase-1 modules you selected:
  - **Leads + enquiries**
  - **Website content**
- Tighten the centre assignment flow so a centre login only sees its own centre’s data and content.
- Improve the centre dashboard/navigation so it feels like a complete centre panel, not a partial stub.

### 2) Question bank + test engine image support
- Add a proper **question image** field for the question stem.
- Support that image through the full flow you requested:
  - Question bank authoring
  - Test creation / saved test questions
  - Test taking UI
  - Results/review screens where relevant
- Use the existing question image storage path and surface upload/preview/remove controls in the editor.
- Keep LaTeX rendering fully compatible with text + image questions.

### 3) Multiple-correct partial marking controls
- Upgrade authoring for `mcq-multi` questions so marking is explicitly configurable per question.
- Keep these marking inputs together:
  - Positive marks
  - Negative marks
  - Partial marking toggle / value behavior
- Align the authoring UI with the current scoring engine so teachers/admins can intentionally create multi-correct partial-marking questions instead of relying on hidden defaults.

### 4) Leadership/about copy fixes
- Fix the V.K. Bansal hero heading so it stays on one line as:
  - **V.K Bansal Sir**
- Reconfirm the Sameer Bansal highlight copy prominently on his page:
  - Mentor of AIR 1 & single-digit rank several times
  - Author of 4 best-selling JEE books

### 5) Replace old real photos + reduce bad face crops across the site
- Replace existing older person photos with the newly uploaded real images.
- Use a **hybrid image strategy** as chosen:
  - originals where a real portrait works best
  - generated editorial hero/banner variants where a wide banner needs better composition
- Update leadership and public-facing hero/section images so faces remain visible and attractive instead of being cut.
- Standardize image treatment across problem areas by adjusting object-position / container ratios instead of letting banners crop faces arbitrarily.

## Technical plan

### Centre admin access
- Review current center role mapping (`center_staff`, `user_roles`, center helper functions) and strengthen route gating around `/center`.
- Ensure admin-created centre users can be assigned cleanly to a centre and inherit `center_admin` access.
- Expand centre panel pages/components already present (`CenterDashboardPage`, `CenterLayout`, centre enquiry/content pages) rather than creating a second system.

### Question image rollout
- Audit `question_bank`, `test_questions`, editor dialogs, importers, and exam pages.
- If needed, add any missing schema fields for image metadata/path consistency using a migration.
- Rework the authoring UI in `QuestionEditorDialog` and related test-creation flows to expose question image upload.
- Render question images consistently in `QuestionBankPanel`, test-taking pages, and review/result UIs.

### Partial marking authoring
- Reuse existing `test_questions.partial_marking` support and the server-side scoring logic already present in `submit_test_attempt`.
- Expose per-question marking controls in the creation/edit flows so multi-correct questions can be authored correctly.
- Verify that saved configs pass through from question bank to test questions without losing marking settings.

### Photo system cleanup
- Replace hardcoded/older person assets in leadership content with the newly uploaded source images.
- Generate new banner-safe derivatives only where wide editorial treatments are needed.
- Normalize image presentation in key public pages so hero/section compositions preserve faces.
- Update alt text and keep the existing cinematic Bansal editorial direction.

## Files / areas likely involved
- `src/components/CenterLayout.tsx`
- `src/pages/CenterDashboardPage.tsx`
- centre portal pages under `src/pages/Center*.tsx`
- `src/components/QuestionEditorDialog.tsx`
- `src/components/QuestionBankPanel.tsx`
- `src/pages/CreateTestPage.tsx`
- `src/pages/TestTakingPage.tsx`
- `src/pages/TestResultPage.tsx`
- `src/pages/LeadershipDetailPage.tsx`
- `src/content/bansal/leaderEditorial.ts`
- public landing/about/hero sections using person images
- migration(s) only if image/marking fields are incomplete

## Delivery order
1. Centre admin access and portal tightening
2. Question image support end-to-end
3. Multi-correct partial marking authoring
4. Leadership text fixes
5. Person image replacement + cropping cleanup across public pages

## Notes
- I’ll keep this scoped to the modules you selected for centre admins in phase 1, not expand into student/tests control unless you ask.
- For regenerated banners, I’ll use your uploaded faces as the source reference and keep the brand’s orange/navy editorial look.