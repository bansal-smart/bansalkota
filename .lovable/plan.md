## 1. Strict 10-digit phone validation on every enquiry form

Add a shared validator `isValidIndianPhone(v)` (regex `^[6-9]\d{9}$` after stripping non-digits) plus a `<PhoneInput>` helper that restricts typing to digits and caps at 10. Apply it (input + submit-time check, blocking submission with toast/inline error) to:

- `src/components/landing/LandingCTAForm.tsx` (homepage "Book your free 15-min call")
- `src/components/landing/WelcomeEnquiryPopup.tsx`
- `src/components/landing/LeadForm.tsx` + tighten `leadFormSchema.phone` in `src/lib/landingSchemas.ts`
- `src/components/CourseEnquiryDialog.tsx` (student + parent phone)
- `src/components/CenterOfflineSections.tsx` (both centre enquiry forms)
- `src/pages/ContactPage.tsx`
- `src/pages/BoostPage.tsx` registration form (verify field)
- Any other form discovered during pass (Career page, Centre support, etc.)

## 2. Dynamic honorific for Leadership profiles

- Migration: add `honorific TEXT` column to `public.leadership_profiles` (values like `Sir`, `Ma'am`, blank). Backfill: VK & Sameer → `Sir`; Neelam & Mahima → `Ma'am`.
- `AdminLeadershipPage.tsx`: add Honorific dropdown (Sir / Ma'am / None) in the leader edit form.
- `LeadershipDetailPage.tsx`: remove the hardcoded `HONORIFIC` map and inline `slug === "..."` ternaries; read `profile.honorific` and render `${name} ${honorific}` everywhere (hero heading, eyebrow, image alt, recognition replacements).
- Any other display surface (cards, About page) updated to use the DB field.

## 3. Built-In Advantages — link fix + admin editor

- Fix left tile in `LandingPage.tsx` to scroll to the homepage lead form (`#lead-form` / CTA section) instead of `/mentorship`.
- Migration: new table `public.landing_advantages` (image_url, title, alt, link_url, link_type enum `internal|external|anchor`, sort_order, is_active). Seed with the current two tiles. RLS: public read active; admin manage. Add GRANTs.
- New admin page `AdminAdvantagesPage.tsx` under a new sidebar tab "Built-In Advantages" inside `AdminLayout.tsx` (placed near other landing-content tabs). Lets admin edit image (with `AspectRatioHint`), title/alt, target link, toggle active, drag-reorder.
- `LandingPage.tsx` fetches from this table via a small hook (`useLandingAdvantages`) and renders dynamically; falls back to current static images if table empty.

## 4. Remove all Arke / Arke Scholars references

Codebase scan turned up no matches in `src/`, but to be safe sweep:
- `rg -i "arke"` across `src/`, `public/`, `index.html`, `package.json`, `README.md`, all `.md`/`.json` content tables (site_pages, site_content, FAQs, testimonials in DB).
- DB sweep: `UPDATE` any rows in `site_pages`, `landing_page_config`, `platform_settings`, `site_testimonials`, `site_content`, `enquiries`, etc. where text matches `arke` (case-insensitive). Removal/replacement done in a data migration via insert tool.

## 5. Blogs module (admin + public)

Database (migration):
- `public.blog_posts` — slug (unique), title, excerpt, cover_image_url, content_html (rich), content_json (TipTap JSON), author_id, status (`draft|published`), published_at, tags TEXT[], seo_title, seo_description, view_count.
- `public.blog_categories` — slug, name, description.
- RLS: public read where `status='published'`; admins full manage. GRANTs included.

Admin:
- New sidebar tab "Blogs" in `AdminLayout.tsx`.
- `AdminBlogsPage.tsx` — list, search, filter by status, create/edit/delete, reorder published list.
- `CreateBlogPage.tsx` — reuses existing `RichTextEditor.tsx` (TipTap) with image upload (Supabase storage bucket `blog-images`), table, code block, and KaTeX/MathLive equation extension. Auto-slug from title, cover image upload (16:9 hint), tags chip input, SEO fields.

Public:
- `/blog` (`BlogsPage.tsx`) — published list with cover, title, excerpt, date, tags.
- `/blog/:slug` (`BlogDetailPage.tsx`) — renders sanitized HTML, JSON-LD Article schema, related posts.
- Add "Blog" link to footer/nav.

## Technical notes

- Phone validator lives in `src/lib/validators.ts` and is reused everywhere; both forms restrict `inputMode="numeric"` and strip non-digits on change.
- Storage bucket `blog-images` created via migration (public read).
- Rich editor reuses existing `RichTextEditor.tsx` — extended with `@tiptap/extension-code-block-lowlight` (already present if installed) and a math node using existing MathLive setup; otherwise add minimal LaTeX inline node.
- All new admin tabs respect existing `is_admin_or_super` role check.
- Verification: run TS check + Playwright smoke on homepage lead form (try 9-digit phone → expect block; valid 10-digit → submit) and blog create flow.

## Out of scope

- Migrating leadership "Sir/Ma'am" appended into the `name` column (kept separate per data hygiene; display concatenates).
- Comments / likes on blogs.