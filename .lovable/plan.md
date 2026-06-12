
## Status check — what's done vs. still pending

### Already shipped earlier
- `CenterContentPage.tsx` created, `CenterStaffModal.tsx` + `manage-center-admin` edge function in place, `center_admin` role wired into AdminUsersPage.
- `question_image_url` and `partial_marking` already render in `TestTakingPage` and serialize through `CreateTestPage`.
- Partial-marking checkbox exists in `CreateTestPage` for `mcq-multi`.
- New editorial banner assets for Sameer / V.K. / Mahima / Neelam exist.
- Sameer Sir credentials ribbon (AIR 1 + 4 books) already on his About page.
- Hero background photo removed and Neelam's gallery hidden (last turn).

### Still pending (this plan)

**1. Centre admin panel wiring**
- Route `CenterContentPage` under `/center/content` in `src/App.tsx` and add it to the `CenterLayout` sidebar so centre admins can actually open it.
- Restrict centre side-nav to the phase-1 scope chosen (Leads + Enquiries, Website Content, Banners, Courses, Support). Hide modules outside that scope from the centre dashboard cards.
- Make sure `ProtectedCenterRoute` lets only users with `center_admin` / linked `center_staff` in.

**2. Question images + partial marking in the authoring UIs**
- `QuestionEditorDialog.tsx` (used by Question Bank): add a Question Image upload field (uploads to existing `question-images` bucket), preview + remove, persist to `question_bank.question_image_url`. Also expose Positive / Negative / Unanswered marks and a Partial Marking toggle (only enabled for `mcq-multi`).
- `QuestionBankPanel.tsx`: show a small thumbnail when a question has an image, and forward `question_image_url` + `partial_marking` when "Add to Test" pushes questions into `CreateTestPage`.
- `CreateTestPage.tsx`: when a row has a `question_image_url`, render preview and allow replace/remove inline so the image survives into `test_questions` on save.
- `TestResultPage.tsx` review section: render `question_image_url` if present (parity with `TestTakingPage`).

**3. V.K. Bansal hero heading — force single line**
- In `LeadershipDetailPage.tsx`, for `slug === "vk-bansal"` render the H1 as one continuous line: **"V.K Bansal Sir"** (no first/last split, no `block` stacking), clamp font-size down on mobile so it never wraps.

**4. Photo cleanup (no AI regeneration this pass)**
- The hero background image was already removed last turn, so face-cropping in hero is no longer an issue.
- Audit remaining person images on `LandingPage`, `AboutPage`, `EducatorsPage`, `CentresShowcase`, and toppers/educator cards — switch any `object-cover` portrait that crops faces to `object-top` or `aspect-[3/4]` containers so faces stay visible. No new image generation; we reuse the existing uploaded assets.

**5. Sameer Sir highlight reconfirm**
- The orange credentials ribbon already shows "Author of 4 best-selling JEE preparation books · Mentor of All India Rank 1 and single-digit ranks several times." Verify position (directly under hero) and bump visual weight if it's buried. No content change unless wording drift is found.

## Technical notes
- No DB migration needed — `question_image_url`, `partial_marking`, and `center_admin` columns/roles already exist.
- Image uploads reuse the existing private `question-images` bucket with signed URLs (same pattern `TestTakingPage` already consumes).
- Centre nav changes are presentation-only; access rules stay on `ProtectedCenterRoute` + RLS.

## Delivery order
1. Route + sidebar wiring for centre content page (small, unblocks centre admins).
2. `QuestionEditorDialog` image upload + marking controls.
3. `QuestionBankPanel` thumbnail + forwarding, `CreateTestPage` image preview, `TestResultPage` review image.
4. V.K. Bansal single-line H1.
5. Image-crop audit pass on public pages.

## Out of scope (kept off, per earlier scope)
- New AI-generated portraits (skipping regeneration — using existing uploaded assets only).
- Student / test control modules inside the centre panel.
