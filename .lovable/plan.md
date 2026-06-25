## Goal
Polish the admin Books form, add a cover image upload, and add an Edit modal so each book's full details can be updated after creation.

## 1. Add labels + dropdowns to the "Add Book" form
File: `src/pages/AdminBooksPage.tsx` (BooksTab + shared `BookFormFields` extracted for reuse in the edit modal).

- Wrap every input in a labeled field (`<label>` + helper text where useful) so nothing renders as an unlabeled box. Current unlabeled fields are Price, Original Price, and Stock — they will get labels.
- Convert these inputs to dropdowns (`<Select>` from `@/components/ui/select`):
  - **Subject** — Physics, Chemistry, Mathematics, Biology, Mental Ability, Mixed / General
  - **Target Exam** — JEE, NEET, NTSE / Olympiads, Foundation, CBSE / Board, Mixed
  - **Class Level** — Class V, VI, VII, VIII, IX, X, XI, XII, XI & XII, Droppers
- Keep Slug, Title, Author as text inputs; Price / Original Price / Stock as labeled number inputs.
- Re-grid the form to a clean 2-col (md) / 3-col (lg) layout so it doesn't look like the screenshot.

## 2. Cover image upload
- Add a "Cover image" field above the rest of the form. Uses the existing `cover_url` column on `public.books` (already present — no migration needed).
- Create a new public storage bucket `book-covers` (5 MB limit, image mime types) via migration. Policies: public read; admins/super admins can insert/update/delete (matches the role pattern used elsewhere).
- Upload on file pick → store the public URL in `cover_url`. Show a thumbnail preview + "Remove" action.
- Show a small cover thumbnail in the first column of the Books table.

## 3. Edit modal for existing books
- Add a pencil "Edit" button in each row (next to Delete).
- Clicking opens a Dialog (`@/components/ui/dialog`) containing the same `BookFormFields` component, pre-filled with that book's values, plus the cover uploader.
- Save → `update` on `public.books`, then refresh the list. Modal also supports replacing the cover image.
- "Add Book" continues to live inline above the table (unchanged behavior, just better UI).

## Technical notes
- New migration: create `book-covers` storage bucket + policies (public read; write/delete restricted to `admin` / `super_admin` via `has_role`).
- Refactor: extract a `BookFormFields` component used by both the Add card and the Edit dialog so the field list stays in one place.
- No changes to PacksTab in this pass (out of scope per the request).
- Dropdown option lists live in a constants block at the top of the file so they're easy to tweak later.

## Out of scope
- Editing module packs (not mentioned).
- Changing the public store / book detail pages.