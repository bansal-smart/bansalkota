# CBT Test-Taking UI Fixes

Three scoped fixes in `src/pages/TestTakingPage.tsx`. No DB or schema changes.

## 1. Duplicate question image

**Cause:** Older questions imported before the previous fix have an `<img>` inline inside `question_text` AND a separate `question_image_url`. The page renders both → image appears twice.

**Fix:** Render the standalone `<img>` (lines 643–650) only when `question_text` does **not** already contain an `<img` tag. The image then never duplicates, regardless of when the question was imported.

```ts
const stemHasInlineImg = /<img\b/i.test(q.question_text || "");
{q.question_image_url && !stemHasInlineImg && ( ... )}
```

## 2. Subject-wise question numbering + subject switcher in palette

Currently every question is numbered globally (1…75) — Q42 is "Physics 42/75" even if it's only the 2nd Physics question. The right-rail palette also stacks ALL subjects together.

**Fixes (UI only, no data changes):**

- **Header (line 619):** Show `Question No. {subjectIndex + 1}` instead of global `currentQ + 1`, with subtitle `{activeSubject} · {subjectIndex+1} / {subjectCount}`.
- **Right-rail palette (lines 727–745):** Replace the "all subjects stacked" view with a **subject switcher** at the top of the palette (Physics / Chemistry / Math / Biology pills based on `subjects`), and show only the active subject's question boxes below. Numbers shown inside boxes become 1…N per subject (display only — internal `i` index unchanged so jumps still work).
- The switcher in the palette stays in sync with the existing top Subject tabs (Strip 3) — clicking either updates `activeSubject`.

This matches the user's request: "subject wise numbering will be there so numbering, question number boxes in right side will be subject wise. mean switch subject option should be there."

## 3. Sticky bottom action bar

The action bar (Mark for Review & Next / Clear / Save & Mark / Previous / Save & Next) currently sits as the last child of the page flex column. On smaller laptop viewports the question area can push it out of view.

**Fix:** Make the bar a true sticky footer:
- Add `sticky bottom-0 z-30` to the action-bar wrapper (line 758) so it stays pinned at the bottom of the viewport over the scrollable question area.
- Keep the existing top shadow so it visually detaches from content.
- The right-rail Submit Test button (inside the aside) is already pinned via `border-t` at the bottom of the flex column — unchanged.

## Out of scope

- No changes to scoring, submission, palette legend, topic pills, MatchFollowing, NumericInput, or the docx importers.
- No DB/schema/RLS changes.
- Subject ordering follows existing `subjects` array order (first-seen in `questions`).
