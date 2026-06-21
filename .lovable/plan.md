## Problem

In admin "Master method — bulk import from Word (.docx)" preview, question stems, options, and solutions show raw LaTeX like `$\Lambda_m^\circ(\text{CH}_3\text{COOH})$` instead of rendered math.

Root cause: the preview dialogs inject HTML via `dangerouslySetInnerHTML={{ __html: previewHtml(...) }}`, which bypasses KaTeX. The student-facing test page already wraps `question_text` and option `text` in `<MathRenderer>`, so once imported, students see properly rendered math — this is purely an admin preview rendering gap.

## Fix

Replace raw `dangerouslySetInnerHTML` with `<MathRenderer content={previewHtml(...)} />` in both docx import dialogs. `MathRenderer` already preserves embedded `<img>` tags (via `extractSafeImages`), so image markers resolved by `previewHtml` continue to display, and `$...$` / `$$...$$` segments render through KaTeX.

### Files to edit

1. `src/components/DocxCommonImportDialog.tsx`
   - Line ~908–911: stem preview block — swap the `<div dangerouslySetInnerHTML=...>` for `<MathRenderer content={previewHtml(q.stemHtml, q.images)} className="prose prose-sm max-w-none text-[13px] leading-relaxed rounded-md bg-muted/30 p-3 border border-border" />`.

2. `src/components/DocxBulkImportDialog.tsx`
   - All 5 `dangerouslySetInnerHTML={{ __html: previewHtml(...) }}` sites (lines ~675, ~692, ~712, ~742, ~758 — stem, match-left, options ×2, solution): replace each with `<MathRenderer content={previewHtml(...)} ... />` keeping existing classNames. For inline option cells, pass `inline`.

No data-shape, no DB, no student-side changes — student rendering already works.

## Verification

- Reopen the bulk import preview with the same .docx; Q2 stem and options should display rendered chemistry/molar conductivity notation.
- Image-bearing questions (Q3) should still show their inline images, since `MathRenderer` preserves `<img>` tags.
