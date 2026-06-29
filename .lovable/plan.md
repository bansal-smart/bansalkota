## Master DOCX Import v2

Server-side parser replaces the client-side one. The existing `DocxBulkImportDialog` (preview, edit, validate, save to `test_questions`) is reused — it already maps cleanly to your `test_questions` schema. Only the *parse step* moves to an edge function, and JEE bracket sections are now recognized.

### What changes

1. **New edge function `master-import-docx`** (Deno):
   - Accepts a multipart `.docx` upload + optional `batchId`.
   - Unzips via `JSZip`, reads `word/document.xml`, `_rels`, `word/media/*`.
   - Converts every `<m:oMath>` / `<m:oMathPara>` to LaTeX using the `mml-to-latex` npm package, with raw-XML fallback wrapped in `$…$` plus an `equation_parse_warning`.
   - Uploads every image straight to the existing `question-images` bucket at `master-import/{batchId}/{imageId}.{ext}` and signs a 100-year URL — returned URLs are inlined into stem/options/solution HTML, so the dialog no longer runs a second image-upload pass.
   - State-machine parses the document into ordered question blocks. Returns JSON shaped like `ParsedDocxQuestion[]` (same shape the dialog already consumes), plus `warnings` array and `detectedOptionStyle`.

2. **Section detector** (server) maps JEE bracket headers to the platform's existing types — no schema change:

   | DOCX section | Stored as |
   |---|---|
   | `[True and False TYPE]` | `mcq-single`, 2 synthesized options True / False |
   | `[SINGLE CORRECT CHOICE TYPE]` | `mcq-single` |
   | `[MULTIPLE CORRECT CHOICE TYPE]` | `mcq-multi` |
   | `[REASONING TYPE]` | `mcq-single` with the 4 standard Statement-1/2 options cloned onto every Q |
   | `[PARAGRAPH TYPE] (SINGLE …)` | `mcq-single` with passage prepended to stem |
   | `[PARAGRAPH TYPE] (ONE OR MORE …)` | `mcq-multi` with passage prepended |
   | `[PARAGRAPH TYPE] (NUMERICAL …)` | `numerical` with passage prepended |
   | `[STEM TYPE (NUMERICAL …)]` | `numerical` with stem prepended |
   | `SINGLE DIGIT INTEGER` / `NON-NEGATIVE INTEGER` | `integer` |
   | `[NUMERICAL VALUE]` | `numerical` (range supported via `Ans. (0.45 to 0.55)`) |
   | `[MATCHING LIST TYPE]` | `mcq-single` (options are the list mappings) |
   | `[MATCHING TYPE PARAGRAPH]` / `MATCH THE COLUMN` | `match-following` with the table parsed |

   Each section also captures `marking_scheme` (Full / Partial / Negative / Zero) — surfaced as warnings if it differs from the test-level marks the admin entered. No DB column needed: the dialog already lets admin override.

3. **Answer parser** handles `Ans. (A)`, `Ans. (A, D)`, `Ans. 10`, `Ans. [25000]`, `Ans. (00.75)`, `Ans. (0.45 to 0.55)`. Ranges become `{ min, max }` and route through the existing `answer_range_min/max` columns.

4. **Client integration**:
   - New `src/lib/docxImport/masterImport.ts` posts the file to `master-import-docx` via `supabase.functions.invoke` and returns `ParseResult` in the exact shape the dialog already uses.
   - `DocxBulkImportDialog` only swaps `parseDocxQuestions(file)` for `parseDocxRemote(file)` when launched from the Master Import button. Common Import (simple template) stays on the existing client parser.
   - Since images are already uploaded server-side and URLs are inlined, the dialog skips `uploadParsedImages` for Master Import payloads (a `serverSideImages: true` flag controls this).
   - Per-question `warnings[]` are rendered as small amber badges in the preview card. Critical-only (missing answer, empty option, equation_parse_warning, image_position_warning).

5. **No schema migration.** The existing `question_import_batches` row continues to be created from the client right before calling the edge function, so the `batchId` is available for image paths and the existing undo flow.

6. **Removed**: the old in-browser OMML preprocessor, JSZip dep in client code paths used only by Master Import (Common Import still uses client-side parsing).

### Technical details

- Edge function uses: `npm:jszip@3`, `npm:mml-to-latex@1`, `npm:fast-xml-parser@4`, Supabase service-role client (already available via `Deno.env`).
- OMML conversion: try `mml-to-latex` on each `<m:oMath>` block first; on throw, fall back to concatenating `<m:t>` nodes wrapped in `$…$` and emit `equation_parse_warning`.
- Images: stream bytes from the unzipped `word/media/*`, infer extension from `Content_Types.xml`, upload with `service_role`, mint signed URL, then string-replace the docx relationship id (`r:embed="rIdX"`) → `<img src="…">` in the generated HTML.
- HTML generation: instead of mammoth, walk the XML directly (paragraph → runs → optional drawing → optional OMML) so we keep order, equations, and images interleaved. This is the only way to satisfy "preserve inline order".
- State machine: top-level scan tags every paragraph with `{ kind: header|passage|stem|option|answer|solution, text, html, images, sectionType }`, then `questionSplitter` groups them on `Q.N` boundaries.
- True/False auto-options, Reasoning auto-options, paragraph prepend, range answers, matching tables — all live in pure server code; no client logic to retest.
- Function timeout: returns within ~5–15 s for the 633 KB JEE file (vs. browser freeze today). 20 MB upload cap (matches current limit).

### Files

- `supabase/functions/master-import-docx/index.ts` *(new, ~600 lines)*
- `src/lib/docxImport/masterImport.ts` *(new, ~60 lines)*
- `src/components/DocxBulkImportDialog.tsx` *(swap parse call + render warnings + skip image-upload pass when server-side)*
- `src/components/MasterImportInstructions.tsx` *(refresh wording for the new section-header support)*

No DB migration. No changes to `test_questions`, `question_bank`, or any downstream test player / results / reports code.

### Out of scope (not in this build)

- The fully normalized `questions` / `question_passages` / `question_assets` tables from your spec (you chose to keep the existing schema).
- Adding new platform question types like `assertion_reason` / `paragraph_*` as first-class types — they are mapped to existing types as described above.
- The standalone "import preview page". Preview stays inside the existing modal.
