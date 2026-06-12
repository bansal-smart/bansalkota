## Problem

In the live test, option text is showing the raw LaTeX source instead of the formatted formula, e.g. the user sees literal `$\left(\dfrac{\alpha\beta}{\alpha+\beta}\right)t$` instead of the rendered fraction.

Data is correct in the database — every option is stored with proper `$...$` LaTeX. The current `MathRenderer` pipes the string through `react-markdown` + `remark-math` + `rehype-katex`, which is fragile for short inline strings that start with a backslash (`$\left(...)$`, `$\dfrac{...}$`, `$\ce{...}$`). Markdown parsing also occasionally swallows or splits the `$...$` delimiters, leaving the source visible.

The fix is to stop relying on the markdown layer for math and render KaTeX directly, then use that everywhere a question / option / explanation is displayed.

## What I will change

### 1. Rewrite `src/components/MathRenderer.tsx`
- Drop `react-markdown` / `remark-math` for math handling.
- Use `katex` directly: split the input on `$$...$$` (display) and `$...$` (inline), render each math segment with `katex.renderToString` (with `throwOnError: false`, `strict: false`, `trust: true`, mhchem macro loaded), and render text segments as plain text (with `\n` → `<br/>`).
- Keep the same props (`content`, `className`, `inline`) so no callers need to change.
- Continue to import `katex/contrib/mhchem` so `\ce{...}` chemistry keeps working.
- Preserve the existing `.math-content` CSS hooks in `src/index.css` (responsive overflow, image scaling).

### 2. Replace raw HTML rendering of question text with `MathRenderer`
These spots currently use `dangerouslySetInnerHTML` and will show raw `$...$` to staff:
- `src/pages/AdminTestDetailPage.tsx` — questions table (Q text + hardest/easiest analytics rows).
- `src/components/QuestionBankPanel.tsx` — bank list previews.
- `src/components/QuestionEditorDialog.tsx` — live preview area, if it does the same.
- `src/pages/AdminQuestionBankPage.tsx` and `src/pages/TeacherQuestionBankPage.tsx` — list rows.

Each becomes `<MathRenderer content={q.question_text} inline />` (use `inline` inside table cells, block elsewhere).

### 3. Verify end-to-end
After the change, load `/tests/rt-03-jee-main-14jun2026/take` in the preview and confirm:
- Q1 Physics options render as proper fractions (α, β, dfrac, parentheses).
- Q14 Chemistry options with `\ce{...}` render with correct subscripts.
- Q4 Maths Venn-diagram question image still shows.
- The post-submit review page (`TestSubjectBreakdownPage`) and result page (`TestResultPage`) also render options correctly (they already use `MathRenderer`, so they automatically benefit).

### Out of scope
- No schema or seeded data changes — the stored LaTeX is already correct.
- No edits to the CBT timer, scoring, or palette logic.
- No design / color changes.

## Technical notes

- `katex.renderToString` returns sanitized HTML; we inject it via `dangerouslySetInnerHTML` only on the math segments we generated ourselves, so no untrusted HTML reaches the DOM.
- The splitter must be greedy-safe: scan left-to-right, prefer `$$...$$` before `$...$`, and treat an unmatched trailing `$` as literal text so partially-typed LaTeX in the question editor doesn't blow up the preview.
- Backslash-newline and `\\` (line break in matrices) are preserved by handing the raw segment straight to KaTeX.
