## Plan: AI-generated course banners (12 courses, color-coded)

Use the two uploaded banners for the matching JEE courses and generate 10 more in the **exact same style** (3:2 cinematic banner: bold course name + class/program badge + tagline + icon feature strip + student-with-books photo + formulas/visual motif on the right). Each card on the courses page and the hero on the detail page reads from `courses.thumbnail_url`, which is currently empty for all 12 — same image fills both surfaces, no UI changes needed.

### Color system (matches your brief)
- **JEE → Bansal blue** (deep navy + electric blue glow)
- **NEET → Green** (deep forest + emerald glow, DNA/molecule motif)
- **Pre-Foundation / Foundation → Sky blue** (lighter, brighter blue, friendlier classroom motif)

### Course → asset mapping

| Slug | Banner |
|---|---|
| `bulls-eye-jee-advanced` | **Uploaded** Bull's Eye Class XI JEE |
| `nucleus-jee-main-advanced` | **Uploaded** Nucleus Class XII JEE |
| `sterling-jee-foundation` | NEW — JEE blue, "STERLING / Class X / JEE Foundation" |
| `elite-jee-droppers` | NEW — JEE blue (deeper, fiery accent), "ELITE / Dropper / JEE Advanced" |
| `vijeta-neet-class-11` | NEW — NEET green, "VIJETA / Class XI / NEET Program" |
| `vijeta-neet-class-12` | NEW — NEET green, "VIJETA / Class XII / NEET Program" |
| `vijeta-neet-droppers` | NEW — NEET green (deeper), "VIJETA / Dropper / NEET Program" |
| `neev-class-6` | NEW — Sky blue, "NEEV / Class VI / Pre-Foundation" |
| `neev-class-7` | NEW — Sky blue, "NEEV / Class VII / Pre-Foundation" |
| `neev-class-8` | NEW — Sky blue, "NEEV / Class VIII / Pre-Foundation" |
| `udaan-class-9` | NEW — Sky blue, "UDAAN / Class IX / Foundation" |
| `udaan-class-10` | NEW — Sky blue, "UDAAN / Class X / Foundation" |

### Steps
1. Copy the two uploaded images into `src/assets/courses/` as `bulls-eye-class-11.jpg` and `nucleus-class-12.jpg`.
2. Generate 10 new banners (`imagegen--generate_image`, `premium` tier for legible text, 1536×1024) into `src/assets/courses/` using a shared style prompt per category — same composition language as the references, swapping color palette and the right-side motif (rocket / DNA helix / classroom + books / stopwatch etc.).
3. Upload all 12 images to the `course-thumbnails` storage bucket (create bucket via migration if missing, public read) and run an `UPDATE courses SET thumbnail_url = ... WHERE slug = ...` migration so the cards and detail hero pick them up automatically.

### Technical notes
- No component edits — `CoursesPage` and `CourseDetailPage` already render `thumbnail_url`.
- Premium tier image gen is used because the banners contain headline text that must stay legible.
- One Supabase migration: optional bucket create + 12 row updates.
- Out of scope: changing card aspect ratio, adding a separate `banner_url` column, or editing course copy.