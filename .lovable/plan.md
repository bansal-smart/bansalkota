## 1. Indian number format for prices

Replace `.toLocaleString()` with `.toLocaleString("en-IN")` everywhere a course/book price renders so ₹135,700 becomes ₹1,35,700.

Files to touch:
- `src/pages/CourseDetailPage.tsx` — price, original_price, fee-structure breakdown lines
- `src/pages/CoursesPage.tsx` — card prices
- `src/pages/BookDetailPage.tsx`, `src/pages/EStorePage.tsx`, `src/pages/CheckoutPage.tsx`, `src/pages/OrdersPage.tsx` — quick audit and fix any plain `toLocaleString()` on rupee values

(`FeaturedProductsSection`/`UpcomingBatches` already use `en-IN`.)

## 2. Render tables & spacing in admin-authored description

The detail page renders `description_html` inside Tailwind `prose`, which collapses empty paragraphs and gives tables no borders. Update the wrapper in `src/pages/CourseDetailPage.tsx` (the block around line 376) so the saved HTML matches what the rich-text editor shows:

- Add table styling utilities (same set used in `RichTextEditor.tsx`): `[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1`
- Preserve gaps between sections: add `[&_p:empty]:h-4 [&_p:empty]:block` (so empty paragraphs from Enter-Enter still show vertical gap) and `prose-headings:mt-6`.

## 3. Course create/edit form fixes (`src/pages/CreateCoursePage.tsx`)

- **Exam dropdown**: replace `examNames` from `useExams` with a hardcoded list `["IIT-JEE", "NEET", "Foundation"]`. Default value `"IIT-JEE"`.
- **Remove Subject dropdown** (top-level `subject` select). Keep saving `subject` in payload as the first item of `subjectsCovered` (or `"General"` fallback) so existing DB column stays satisfied.
- **Remove Educator Name input** (the `isAdminContext` block). On submit, fall back to user's name/email automatically (already implemented in `resolvedEducatorName`).
- **Subjects Covered → chip input**: remove the `SUBJECT_PRESETS` toggle buttons. Add a text input; pressing Enter (or comma) pushes the trimmed value into `subjectsCovered` and clears the field; each chip has an × button to remove. Display existing chips above the input.
- **Floating action bar**:
  - Change container from `fixed bottom-0 left-0 right-0` to a sticky bar inside the form column. Use `sticky bottom-0` with a transparent outer wrapper and an inner pill (`bg-card border border-border rounded-xl shadow-lg`) so it sits only over the form, not over the admin sidebar.
  - Increase form bottom padding (`pb-32` → `pb-40`) and add `mb-8` after the Pricing card so the price inputs are never hidden under the bar.

No DB / schema changes required.

### Technical detail
- `inrFormat = (n) => Number(n||0).toLocaleString("en-IN")` helper used in CourseDetailPage / CoursesPage.
- Chip input state: reuse `subjectsCovered`; new `subjectInput` state; handler on `onKeyDown` for `Enter`/`,`.
- Sticky bar markup roughly:
  ```tsx
  <div className="sticky bottom-4 z-40 flex justify-end">
    <div className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
      <button …>Save as Draft</button>
      <button …>Save & Publish</button>
    </div>
  </div>
  ```
