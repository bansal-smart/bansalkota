
# Test Platform & Question Bank — Cleanup Plan

## Problem today

The admin sidebar exposes **6 separate test-related entries** (Test Platform, All Tests, Test Series, Test Attempts, Question Bank, Import Batches). They overlap, the entry points are confusing, and the same actions (create / edit / publish / import) are repeated in different places. Question Bank lacks a visible bulk-upload sample format. In the test creator, the bank panel only supports drag (no one-click add on small screens). Math/image rendering needs a top-to-bottom audit.

## 1. Restructure admin sidebar — one "Test Platform" entry

Collapse the 6 sidebar items into **one**: `Test Platform → /admin/tests-hub`. Everything else lives as **tabs inside the hub**, not separate sidebar pages.

```text
Sidebar:        Test Platform  (/admin/tests-hub)
                 │
Hub tabs:        ├─ Overview      (current dashboard charts)
                 ├─ All Tests     (table from AdminTestsPage)
                 ├─ Upcoming      (tests with starts_at in future)
                 ├─ Test Series   (AdminTestSeriesPage)
                 ├─ Question Bank (AdminQuestionBankPage panel)
                 ├─ Attempts      (AdminTestAttemptsPage)
                 └─ Imports       (AdminImportBatchesPage)
```

- `+ New Test` button stays pinned in the hub header (routes to `/admin/tests/new`).
- Each row in **All Tests** keeps Manage / Edit / Preview / Publish-Unpublish / Delete (already built — just surfaced consistently).
- **Upcoming** tab filters by `starts_at > now()` and surfaces "Edit", "Change schedule", "Replace questions" inline.
- Old routes (`/admin/tests`, `/admin/test-attempts`, `/admin/test-imports`, `/admin/test-series`, `/admin/question-bank`) keep working but redirect to the relevant hub tab so existing links/bookmarks don't break.

## 2. Question Bank — visible sample format + better bulk flow

In `QuestionBankPanel` (the panel shown on `/admin/question-bank` and inside the hub tab):

- Add a **"Download sample format"** split button next to **Word import** / **Bulk CSV** that downloads:
  - `question-bank-template.csv` (CSV with example rows — already built in `BulkQuestionUploadDialog`).
  - `question-bank-template.docx` (a tiny Arke-format sample doc with one MCQ, one numerical, one match-the-following). Built once with `docx-js`, committed under `public/templates/`.
- Inline help card above the question list: "Need bulk upload? Download the sample, fill it in, then use Word import or Bulk CSV." (collapsible, remembers state).
- In both **bulk dialogs**, show the same "Download sample" link at the top so users never get stuck.

## 3. Create / Edit Test — click-to-add + drag-and-drop

In `CreateTestPage`'s Question Bank panel (right side / sheet):

- Keep the existing **drag-and-drop** flow (already wired through `@dnd-kit`).
- Add a **+ Add** button on every bank card (`QuestionBankPanel` in `draggable` mode) that calls the same `fromBank()` insertion path. Disabled (with tooltip "Already added") if the question is already in the draft list.
- Add a **bulk "Add selected"** action when filters are active: a checkbox on each card + a sticky footer "Add N selected questions" — uses the same insertion path.
- Keep the bank sheet open after add (don't auto-close) so admins can stack picks quickly.

## 4. Render math + images consistently everywhere

Audit every place a question is shown and ensure `MathRenderer` (KaTeX with mhchem) is used, and `question_image_url` / `option_images[]` render with a uniform `<img>` + zoom wrapper:

- **Admin**
  - `AdminTestDetailPage` Questions tab: already uses `MathRenderer`. Add option preview + image thumbnails.
  - `QuestionBankPanel` (cards + table): already uses `MathRenderer`. Add a small image icon when the question has an attached image.
  - `CreateTestPage` draft list: render LaTeX preview under each option (currently only the textarea is shown).
- **Student**
  - `TestTakingPage`: confirm option text uses `MathRenderer` and `option_images[oi]` renders with zoom (already wired; verify match-following options).
  - `TestSubjectBreakdownPage`: already uses `MathRenderer`; verify option image and explanation paths.
  - `TestResultPage` review: same audit.

For private-bucket images we already mint signed URLs at upload time — keep that, and add a fallback `signed-url-on-read` helper for any legacy rows that stored `getPublicUrl` paths so old questions don't break.

## 5. Student-side test polish

Quick pass on `TestTakingPage` / `TestInstructionsPage` / `TestResultPage`:

- Make sure **match-the-following** renders the same on the take page, review page, and breakdown page (single `MatchFollowing` component already exists — confirm props match).
- Verify **mcq-multi** correct-answer highlighting and **partial marking** badge.
- On mobile, ensure the palette sheet, timer, and submit modal don't overflow the 761×435 viewport reported by the client.
- Confirm `submit_test_attempt` RPC handles `match-following` scoring (already added in earlier migration — sanity-check the path).

## Technical details

- New files
  - `src/pages/AdminTestPlatformHub.tsx` — wraps the 7 tabs; lazy-loads inner pages so the bundle stays small.
  - `public/templates/question-bank-template.docx` (generated once via skill/docx and committed).
- Edited files
  - `src/components/AdminLayout.tsx` — collapse 6 entries → 1.
  - `src/App.tsx` — point old `/admin/tests*` routes to the hub with a `?tab=` query string, keep `/admin/tests/new`, `/admin/tests/:slug`, `/admin/tests/:slug/edit` for editor flows.
  - `src/components/QuestionBankPanel.tsx` — sample-format dropdown; `onAddToTest` click-handler prop; checkbox-based multi-add when in test-builder context.
  - `src/pages/CreateTestPage.tsx` — wire the click-to-add + multi-add into the bank panel; render LaTeX preview under each draft option.
  - `src/components/DocxBulkImportDialog.tsx` + `BulkQuestionUploadDialog.tsx` — add "Download sample" link in their headers.
- No DB migrations needed; all changes are UI + routing.

## Out of scope

- Re-skinning the test-taking UI (it's already NTA-style).
- Authoring a new question type.
- Touching teacher / center portals (same panel renders there; changes carry over for free).
