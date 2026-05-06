# Question Bank Admin Page + Math/Chemistry Equation Rendering

## Problem

There is no admin tab to add/edit/delete questions in `question_bank`. Today, questions can only be picked from the bank inside test creation but never authored standalone. We also need LaTeX/chemistry equation support both in the editor (write) and the student/test UI (render).

## Scope

### 1. New admin page: `AdminQuestionBankPage`

- Route: `/admin/question-bank` (added to `App.tsx` under the admin protected routes).
- Nav entry in `src/components/AdminLayout.tsx` (icon: `Library` or `BookOpen`) placed under "Tests".
- Uses existing `useQuestionBank` hook for listing, with filters (subject, difficulty, search) + pagination.
- Table columns: Subject, Topic, Difficulty, Question (rendered with math), Created at, Actions (Edit / Delete).
- Toolbar: "Add Question" button → opens an upgraded `QuestionEditorDialog`.
- Delete uses `ConfirmDialog`.

### 2. Equation rendering library

Install: `react-katex`, `katex`, `react-markdown`, `remark-math`, `rehype-katex`, `mathlive`.

- Import `katex/dist/katex.min.css` once in `src/main.tsx`.
- Create reusable `src/components/MathRenderer.tsx`:
  - Wraps `ReactMarkdown` with `remarkMath` + `rehypeKatex`.
  - Accepts `content: string` and renders inline `$...$` and block `$$...$$` math, plus markdown.
  - Adds a small post-process for chemistry: convert `\ce{...}` to KaTeX-compatible via the `mhchem` KaTeX extension (`import "katex/contrib/mhchem"`).
- Create `src/components/MathField.tsx`:
  - Wraps the MathLive `<math-field>` web component as a controlled React input.
  - Emits LaTeX string via `onChange`.
  - Includes a small toolbar hint and "Insert chemistry (\ce{})" helper button.

### 3. Upgrade `QuestionEditorDialog`

- Replace plain `<textarea>` for question text and the 4 option inputs with a hybrid input: a `MathField` (visual equation editor) plus a plain text fallback toggle (so admins can paste raw markdown/LaTeX too).
- Add a live "Preview" pane using `MathRenderer` showing the question + options + explanation as students will see them.
- Persist as plain LaTeX/markdown string in `question_bank.question_text`, `options[].text`, and `explanation` (no schema change — already `text`/`jsonb`).

### 4. Student-side rendering

Swap plain text rendering for `MathRenderer` in:

- `src/pages/TestTakingPage.tsx` — question text, options, (if shown) explanation.
- `src/pages/TestSubjectBreakdownPage.tsx` — question text, user/correct option labels, explanation.
- `src/components/QuestionBankPanel.tsx` — preview cards.
- `src/pages/CreateTestPage.tsx` — question text preview in the draft list.

No changes to AI doubt solver or other pages in this pass.

## Out of scope

- No DB schema migration (existing columns already store text).
- No bulk import/CSV.
- No image upload changes (existing `question_image_url` stays as is).

## Technical notes

- KaTeX `mhchem` extension supports `\ce{H2SO4 + NaOH -> Na2SO4 + H2O}`.
- MathLive ships as a custom element; declare it in a `.d.ts` (`src/mathlive.d.ts`) so TS accepts `<math-field>` JSX.
- `MathRenderer` should sanitize: pass `skipHtml` to `ReactMarkdown` to avoid raw HTML injection from admin input.

## Files

- New: `src/pages/AdminQuestionBankPage.tsx`, `src/components/MathRenderer.tsx`, `src/components/MathField.tsx`, `src/mathlive.d.ts`.
- Edit: `src/App.tsx`, `src/components/AdminLayout.tsx`, `src/components/QuestionEditorDialog.tsx`, `src/components/QuestionBankPanel.tsx`, `src/pages/CreateTestPage.tsx`, `src/pages/TestTakingPage.tsx`, `src/pages/TestSubjectBreakdownPage.tsx`, `src/main.tsx`, `package.json`.