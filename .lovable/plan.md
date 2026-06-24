## Changes

**1. "100+ Offline Centres" → "85+ Offline Centres" (Homepage stats banner)**
- `src/pages/LandingPage.tsx` line 258: `value: "100+"` → `"85+"` for Offline Centres tile.

**2. Remove "Explore the Ideal Course For You" section (Homepage)**
- `src/pages/LandingPage.tsx`: delete the entire `{/* 5. COURSES */}` section (lines 444–504), including the exam-tab buttons and the `coursesByExam[exam]` grid.

**3. BOOST page — remove "Cash Prizes" card from "Rewards Worth the Hustle"**
- `src/pages/BoostPage.tsx` line 13: remove the `{ icon: Award, title: "Cash Prizes", … }` entry from the `benefits` array.

**4. /test-series page — title change**
- `src/pages/TestSeriesCatalogPage.tsx` line 26: `Test Series & Mocks` → `Test Series`.

**5. Replace remaining "100+ centres / centers" mentions with "85+"**
- `src/content/bansal/about.ts` line 14: `"100+"` Offline centers → `"85+"`.
- `src/components/landing/CentresShowcase.tsx` line 34: `100+ centres` → `85+ centres`.
- `src/pages/AboutPage.tsx` line 152: `100+` → `85+`.
- `src/components/landing/LandingFAQ.tsx` lines 8 & 14: `100+ centres` → `85+ centres`.
- `src/pages/LandingPage.tsx` line 160 (`clpFeatures`): `100+ Bansal centers` → `85+`.
- `src/pages/LandingPage.tsx` line 520 (CLP card desc): `100+ Bansal centers` → `85+`.
- `src/pages/LandingPage.tsx` line 668 (Centres heading): `100+ Centres Across India` → `85+ Centres Across India`.

**6. "Numbers That Speak for Themselves" stats (Homepage)**
Update the `achievements` fallback array in `src/pages/LandingPage.tsx` (lines 119–124) to:
1. `330+` — AIR in Top 100 (icon: Trophy)
2. `25,000+` — IITians (icon: GraduationCap)
3. `5,000+` — NEET Qualified (icon: Stethoscope)
4. `85+` — Centres (icon: Building2)

Note: this section also reads `dbStats` from the `site_stats` table — when DB rows exist, they override the fallback. Editing the fallback updates the page only if the admin hasn't populated DB stats. If the live page is showing the old numbers because DB rows exist, those need to be edited from the Admin → Site Content area (no code change can override them).

**7. Landing FAQ — drop NTSE from the exams answer**
- `src/components/landing/LandingFAQ.tsx` line 7: answer becomes `"JEE Main, JEE Advanced, NEET-UG, Foundation (Class VI–X) & Olympiads. Dedicated batches exist for repeaters and droppers."` (NTSE removed).

## Out of scope
- Other NTSE references (BOOST eligibility, Achievements filter, Center Detail, Topper admin, modal exam list) — kept since the user only asked about the landing FAQ question.
