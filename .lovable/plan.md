## What the sheet contains

The uploaded file `st_data_1-2.xlsx` has **52 rows** (not 84 — the file shows 52). All rows are **BULLS EYE / JEE / Class XI**, spread across 5 batches:

`XI-J1`, `XI-J2`, `XI-P1`, `XI-P2`, `XI-P*`

Columns: `RegNo` (roll), `StudentName`, `CONTACTNO` (mobile), `Dob`, `COURSE`, `STREAM`, `BATCH`.

## What we already have

The `cbt-bulk-setup` edge function already does exactly this work — given a row array it:
1. Finds/creates the **Kota** center.
2. Finds/creates **Bulls Eye JEE / Sterling JEE / Nucleus JEE** courses (matched by your `COURSE` column).
3. Finds/creates the batch for each `(course, batch_code)` pair under that course.
4. Creates an auth user per student: `email = {roll}@cbt.bansal.local`, `password = mobile number`.
5. Upserts the profile (name, phone, roll, batch, center, stream, class, "Bansal offline" flag).
6. Grants the `student` role + creates an enrollment in the matching course.

It's idempotent — re-running on the same roll numbers updates them instead of duplicating.

The only missing piece is a UI to feed an Excel file into it.

## What I'll build

### 1. XLSX uploader on Admin → Batches
Add an "Import students from Excel" card next to the existing "Run Kota CBT bulk setup" button:

- File input accepting `.xlsx` / `.xls`.
- Client-side parse with **SheetJS** (`xlsx` package — already widely used pattern in the project).
- Map columns: `RegNo → roll_number`, `StudentName → full_name`, `CONTACTNO → phone`, `Dob → dob`, `COURSE → course`, `STREAM → stream`, `BATCH → batch_code`. Derive `class_level` from batch prefix (`XI-` → `"XI"`, `XII-` → `"XII"`, `XIII-` → `"XIII"`).
- Show a preview table (first 10 rows + total count + unique batches list) before submit.
- Submit calls the existing `cbt-bulk-setup` function with the parsed `rows` array.
- Show a result toast: `X created · Y updated · Z errors`, and (if errors) a small expandable list of failing roll numbers.

### 2. Tiny tweak to course matching
Right now the edge function only knows three course slugs (`bulls-eye-jee`, `sterling-jee`, `nucleus-jee`). For unknown course names it creates a new one — I'll leave that fallback but normalise the lookup so `"Bulls Eye"`, `"BULLS EYE"`, `"bulls-eye"` all resolve to the same existing `bulls-eye-jee` course (your earlier import already created it).

### 3. Special batch code handling
`XI-P*` contains a `*` which is fine for our `code` column (free text). I'll keep it as-is so the batch shows exactly as in the sheet.

## Result for you

After clicking Import:
- 1 center (Kota — reused).
- 1 course (Bulls Eye JEE — reused).
- Up to 5 batches under Bulls Eye JEE (`XI-J1`, `XI-J2`, `XI-P1`, `XI-P2`, `XI-P*`) — created if missing.
- 52 student accounts, each able to log in at `https://bansal.doctylia.com/cbt` with their **roll number + mobile**.
- All 52 visible in **Admin → Students** with the `student` role and their batch.

## Files I'll touch

- `src/pages/AdminBatchesPage.tsx` — add uploader card, parse + preview + submit logic.
- `package.json` — add `xlsx` dependency (if not already present).
- `supabase/functions/cbt-bulk-setup/index.ts` — small course-name normalisation so re-imports don't create duplicate courses.

No DB migration needed.
