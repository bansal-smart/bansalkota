## Goal

Make every dynamic block of the course detail page editable from the admin Create/Edit Course form, while keeping the BOOST CTA and "Why Choose this Batch" sections static as you specified.

## Database changes (single migration on `public.courses`)

Add these columns:
- `short_description text` — shown under the course name
- `education_level text` — dropdown value (e.g. Class 11th–12th)
- `duration_label text` — dropdown value (e.g. Up to 12 Months, 1 Year, 2 Years)
- `mode text` — dropdown value (Online / Offline / Hybrid / Residential)
- `language text` — dropdown value (English / Hindi / English & Hindi)
- `subjects_covered text[]` — multi-select chips shown in "Subjects Covered"
- `description_html text` — rich text body for "Know More Details"
- `included_services text[]` — keys of selected service icons (e.g. `["study_material","recorded_lectures","test_series",...]`)

`description` (plain text) stays for backwards compatibility; new pages read `description_html` first and fall back to `description`.

## Admin form (`src/pages/CreateCoursePage.tsx`)

Rebuild the "Basic Information" card to capture, in this order:

1. Course Name (existing)
2. Short Description (always visible, not only on create)
3. Exam + Subject (existing dropdowns)
4. **Subjects Covered** — multi-select chip input (preset: Physics, Chemistry, Maths, Biology, All Subjects)
5. **This Course Includes** group of 4 dropdowns:
   - Education Level: Class 6, 7, 8, 9, 10, 11, 12, Class 11th–12th, Droppers
   - Duration: 6 Months, 1 Year, 2 Years, Up to 12 Months, Up to 24 Months
   - Mode: Online, Offline, Hybrid, Residential
   - Language: English, Hindi, English / Hindi
6. **Detailed Description** — replace the plain `<textarea>` with the existing `RichTextEditor` component (tables, lists, headings already supported), saved to `description_html`
7. New "Course Includes" card — 7 checkboxes with icons matching the page (Study Material, Recorded Lectures, Test Series, T-Shirt, Umbrella, Doubt Classes, Bag). Admin ticks what's included; selections are stored in `included_services`.

All other sections (thumbnail, curriculum, what you'll learn, requirements, pricing) stay as they are.

## Course detail page (`src/pages/CourseDetailPage.tsx`)

- Short description text under the title pulls from `course.short_description`.
- "Subjects Covered" chips render from `course.subjects_covered` (fallback to current single chip).
- "This Course Includes" 4-card row pulls Education Level / Duration / Mode / Language directly from the new columns instead of being computed from `detectMode` and constants.
- "Know More Details" body renders `course.description_html` via the `prose` styles already used on the Book detail page; falls back to plain `description` when empty.
- "Our Services" section is renamed to **Course Includes** and only renders the icons whose keys are present in `course.included_services`. If the array is empty, hide the section entirely.
- BOOST strip and "Why Choose this Batch at Bansal Classes?" block stay static (unchanged).

## Types

Update `CourseRow` in `src/hooks/useCourses.ts` to expose the new columns so both pages compile against the regenerated Supabase types.

## Out of scope

- BOOST CTA content — stays static.
- "Why Choose this Batch" bullets — stays static.
- Curriculum editor, pricing, thumbnail uploader — unchanged.
