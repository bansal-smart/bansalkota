# Dynamic BOOST Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the seven content sections of the public `/boost` page editable by KOTA HQ admins from the admin panel, backed by a single JSON document in Supabase, with the current content seeded as pre-existing data.

**Architecture:** One single-row `boost_page_content` table (`content jsonb`, RLS = public read / `admin`|`super_admin` write, mirroring `boost_settings`). A `useBoostContent` react-query hook returns typed content with the current hardcoded values as `DEFAULTS` fallback. `BoostPage` renders from the hook. A `BoostContentPanel` admin editor (embedded in `AdminBoostPage`) does full CRUD per section and saves the whole document.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS, @tanstack/react-query, @dnd-kit (already used elsewhere for reordering), lucide-react, Tailwind, Vitest + @testing-library/react.

## Global Constraints

- Supabase table writes gated by RLS: `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')`. Never loosen this.
- Follow the existing `.from("table_name" as any)` cast pattern used in [useBoostSettings.ts](../../../src/hooks/useBoostSettings.ts) and [BoostSettingsPanel.tsx](../../../src/components/admin/BoostSettingsPanel.tsx); do NOT hand-edit `src/integrations/supabase/types.ts`.
- Fixed row id constant: `BOOST_CONTENT_ID = "a0000000-0000-0000-0000-0000000b0058"` (one past the boost_settings id `...57`).
- The `{price}` token in content text must be replaced at render with the live `boost_settings.price_inr`. Never hardcode a rupee amount into rendered content.
- Page must render identically to today when the DB row is missing or the fetch fails (DEFAULTS carry the full current content).
- Icon values are names from a fixed whitelist (`ICON_MAP`); unknown/missing names resolve to `Trophy`.
- Run tests with `npx vitest run <path>`. Typecheck with `npx tsc --noEmit`.

---

## Canonical content (used by Task 1 seed AND Task 2 DEFAULTS — must be byte-identical in meaning)

This is the single source of the seeded content. Task 1 encodes it as a SQL `jsonb` literal; Task 2 encodes it as the `DEFAULTS` TS object. Keep them in sync.

```json
{
  "legacy": {
    "badge": "Legacy of Excellence",
    "heading": "Education City Kota's Oldest Institute",
    "body": "Bansal Classes, KOTA is India's most trusted Institute for the preparation of JEE (Main & Advanced), NEET (UG), Olympiads & Foundation (School & Board Examinations). Started by legendary Shri V. K. Bansal Sir in 1981, it is Education City KOTA's oldest Institute.",
    "calloutTitle": "What is BOOST?",
    "calloutBody": "BOOST is a Scholarship Test to be conducted for the students currently studying in Classes 4th to 10th and 11th & 12th (PCM & PCB) in 2026-27 & moving to classes 5th to 12th & 12th Passed in Academic Session 2027-28."
  },
  "benefits": [
    { "icon": "Trophy", "title": "Upto 100% Scholarship", "desc": "Win huge fee waivers on Bansal Classes JEE/NEET/Foundation programs based on your rank." },
    { "icon": "GraduationCap", "title": "Personal Mentorship", "desc": "Top 100 rankers get a one-on-one mentor session with Bansal senior faculty." }
  ],
  "examStructure": {
    "paramHeader": "Parameter",
    "columns": ["NEEV (Foundation)", "JEE (Main & Advanced)", "NEET (UG)"],
    "rows": [
      { "label": "Classes (in 2026-27)", "cells": ["4th to 9th", "10th, 11th & 12th (PCM)", "10th, 11th & 12th (PCB)"] },
      { "label": "Mode of Exam", "span": "Online (At Home) / Offline (At Center)" },
      { "label": "Medium", "cells": ["ENGLISH", "ENGLISH", "ENGLISH"] },
      { "label": "Duration", "span": "60 Minutes (Online Test) | 90 Minutes (Offline Test)" },
      { "label": "No. of Questions", "cells": ["75 Ques.", "75 Ques.", "80 Ques."] },
      { "label": "Subjects Wise Q's", "cells": ["P: 15, C: 15, B: 15, M: 20, MA: 10", "P: 25, C: 25, M: 25", "P: 20, C: 20, Bo: 20, Z: 20"] },
      { "label": "Syllabus", "span": "Visit www.bansal.ac.in", "href": "https://www.bansal.ac.in" }
    ],
    "legend": "P: Physics, C: Chemistry, B: Biology, M: Mathematics, MA: Mental Ability, Bo: Botany, Z: Zoology",
    "markingScheme": "+4 Marks will be given for every Correct Answer, 0 for Not Attempted & -1 for every wrong answer."
  },
  "scholarshipGrid": [
    { "score": "≥95%", "scholarship": "100%" },
    { "score": "≥90% to <95%", "scholarship": "90%" },
    { "score": "≥85% to <90%", "scholarship": "75%" },
    { "score": "≥75% to <85%", "scholarship": "60%" },
    { "score": "≥65% to <75%", "scholarship": "50%" },
    { "score": "≥55% to <65%", "scholarship": "40%" },
    { "score": "≥45% to <55%", "scholarship": "25%" },
    { "score": "≥35% to <45%", "scholarship": "10%" },
    { "score": "≥25% to <35%", "scholarship": "No Scholarship" },
    { "score": "<25%", "scholarship": "Not Selected" }
  ],
  "notes": [
    "If a Student secures Upto 50% Scholarship, he/she will be directly offered that scholarship in Bansal Classes's Classroom Courses in Academic Session 2027-28. If a Student secures more than 50% Scholarship, he/she will be invited for Round-2 where his/her Interview will be scheduled with the Bansal Classes Faculty Team. Based on the recommendation of the Faculty Team, Scholarship may remain the same or be increased/decreased.",
    "If a student is eligible for any other scholarship based on other academic achievements like Board Exam, JEE, NEET, Olympiad performances or past association with Bansal Classes, then he/she will be considered for any one scholarship (Best of all).",
    "Scholarships will be offered only on the Tuition Fee Part of the total Fee.",
    "All the details mentioned in this leaflet are applicable for the Kota Center only. Other Study Centers may have different details.",
    "In case of any dispute, the jurisdiction shall be exclusively at Kota (Rajasthan)."
  ],
  "timeline": [
    { "phase": "Registration", "date": "Open Now", "desc": "Pay ₹{price} and reserve your slot on bansal.ac.in" },
    { "phase": "Admit Card", "date": "T-3 days", "desc": "Download your admit card from the official portal" },
    { "phase": "Test Day", "date": "Every Sunday", "desc": "Online slots and offline center slots available" },
    { "phase": "Result", "date": "Within 48 hrs", "desc": "Scholarship + counselling call from Bansal admissions" }
  ],
  "faqs": [
    { "q": "Who can appear for BOOST?", "a": "Any student from Class 5 to Class 12 (and droppers) preparing for school, Olympiads, JEE, or NEET can register." },
    { "q": "What will be the timings of the test?", "a": "Duration of the Online test will be 1 Hour. A Student can appear in the test between 9 AM to 6 PM on the test day only." },
    { "q": "How to apply & where to take Online Test?", "a": "You can apply online on www.bansal.ac.in after the registration, Student will receive a direct link to appear in the test." },
    { "q": "What is the syllabus of BOOST?", "a": "Syllabus for each class is available on www.bansal.ac.in" },
    { "q": "When will the result be declared?", "a": "Result of first 3 BOOST Test (Which are free of Cost) shall be declared in the last week of September. Results of BOOST to be conducted from October 2026 will be declared after 3 days of BOOST." },
    { "q": "Can I appear in the test from the Institute campus?", "a": "Yes. Student can visit BANSAL Classes, KOTA Campus & appear in the test. For the other Study Centers, Student need to contact the respective study center." },
    { "q": "What subjects are covered in BOOST?", "a": "The test includes Math, Science, and Mental Ability / Logical Reasoning. For higher classes, it may include Physics, Chemistry, and Biology, depending on the student's stream and class." },
    { "q": "Can I take the test from home?", "a": "Yes, the online mode is fully proctored. You can also choose an offline slot at a nearby Bansal center." },
    { "q": "How is the scholarship applied?", "a": "Your scholarship percentage is auto-applied to your Bansal Classes course fee at the time of admission." }
  ]
}
```

---

## Task 1: Database migration — `boost_page_content` table + seed

**Files:**
- Create: `supabase/migrations/<yyyymmddHHMMSS>_boost_page_content.sql`

**Interfaces:**
- Produces: table `public.boost_page_content(id uuid pk, content jsonb, created_at, updated_at)`, one seeded row with id `a0000000-0000-0000-0000-0000000b0058`.

- [ ] **Step 1: Write the migration file**

Use a real timestamp for the filename (e.g. `20260801120000_boost_page_content.sql`). Content:

```sql
CREATE TABLE public.boost_page_content (
  id uuid PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_page_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.boost_page_content TO authenticated;
GRANT ALL ON public.boost_page_content TO service_role;

ALTER TABLE public.boost_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boost_page_content public read" ON public.boost_page_content
  FOR SELECT USING (true);

CREATE POLICY "boost_page_content admin write" ON public.boost_page_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_boost_page_content_updated_at
  BEFORE UPDATE ON public.boost_page_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.boost_page_content (id, content) VALUES (
  'a0000000-0000-0000-0000-0000000b0058',
  '<PASTE the "Canonical content" JSON object above, as a single-quoted SQL string; escape any single quotes by doubling them>'::jsonb
);
```

When pasting the JSON: the apostrophes inside content (`he/she`, `Bansal Classes's`, `India's`, `student's`, `Kota's`) MUST be doubled (`''`) for SQL. Double-check `Bansal Classes's` → `Bansal Classes''s` and `Education City Kota's` → `Education City Kota''s`.

- [ ] **Step 2: Verify the SQL parses (dry check)**

Run: `npx supabase db lint 2>/dev/null || echo "lint unavailable — visually verify quote escaping"`
Expected: no syntax error. Manually confirm every apostrophe in string values is doubled and the JSON is valid (paste the inner JSON into a JSON validator with `''` reverted to `'`).

- [ ] **Step 3: Apply the migration**

Apply via the project's normal Supabase workflow (Supabase MCP `apply_migration`, or `npx supabase db push` against the linked project). Confirm the row exists:
Run (or via MCP `execute_sql`): `select id, jsonb_typeof(content) from public.boost_page_content;`
Expected: one row, `jsonb_typeof` = `object`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_boost_page_content.sql
git commit -m "feat(boost): add boost_page_content table with seeded content"
```

---

## Task 2: Content types, DEFAULTS, and pure helpers (TDD)

**Files:**
- Create: `src/hooks/useBoostContent.ts` (types + DEFAULTS + helpers; the hook itself is added in Task 3)
- Test: `src/hooks/useBoostContent.test.ts`

**Interfaces:**
- Produces:
  - `BOOST_CONTENT_ID: string`
  - Types: `BoostContent`, `ExamRow` (`{ label: string; cells: string[] } | { label: string; span: string; href?: string }`), `BoostBenefit`, `TimelineItem`, `ScholarshipRow`, `Faq`.
  - `DEFAULTS: BoostContent` (full canonical content).
  - `ICON_MAP: Record<string, LucideIcon>` and `resolveIcon(name: string): LucideIcon`.
  - `applyPriceToken(text: string, price: number): string`.
  - `splitScholarship<T>(rows: T[]): [T[], T[]]`.
  - `isSpanRow(row: ExamRow): row is { label: string; span: string; href?: string }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/hooks/useBoostContent.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULTS,
  applyPriceToken,
  splitScholarship,
  resolveIcon,
  isSpanRow,
} from "./useBoostContent";
import { Trophy } from "lucide-react";

describe("applyPriceToken", () => {
  it("replaces {price} with the numeric price", () => {
    expect(applyPriceToken("Pay ₹{price} now", 149)).toBe("Pay ₹149 now");
  });
  it("replaces every occurrence", () => {
    expect(applyPriceToken("{price} and {price}", 99)).toBe("99 and 99");
  });
  it("leaves text without the token unchanged", () => {
    expect(applyPriceToken("no token here", 99)).toBe("no token here");
  });
});

describe("splitScholarship", () => {
  it("splits 10 rows into 5 + 5", () => {
    const [l, r] = splitScholarship(Array.from({ length: 10 }, (_, i) => i));
    expect(l).toEqual([0, 1, 2, 3, 4]);
    expect(r).toEqual([5, 6, 7, 8, 9]);
  });
  it("puts the extra row on the left for odd counts", () => {
    const [l, r] = splitScholarship([1, 2, 3]);
    expect(l).toEqual([1, 2]);
    expect(r).toEqual([3]);
  });
  it("handles empty", () => {
    expect(splitScholarship([])).toEqual([[], []]);
  });
});

describe("resolveIcon", () => {
  it("returns the mapped icon for a known name", () => {
    expect(resolveIcon("Trophy")).toBe(Trophy);
  });
  it("falls back to Trophy for an unknown name", () => {
    expect(resolveIcon("NotARealIcon")).toBe(Trophy);
  });
});

describe("isSpanRow", () => {
  it("is true for a span row", () => {
    expect(isSpanRow({ label: "x", span: "y" })).toBe(true);
  });
  it("is false for a cells row", () => {
    expect(isSpanRow({ label: "x", cells: ["a"] })).toBe(false);
  });
});

describe("DEFAULTS", () => {
  it("has the full seeded shape", () => {
    expect(DEFAULTS.scholarshipGrid).toHaveLength(10);
    expect(DEFAULTS.examStructure.rows).toHaveLength(7);
    expect(DEFAULTS.examStructure.columns).toHaveLength(3);
    expect(DEFAULTS.faqs).toHaveLength(9);
    expect(DEFAULTS.benefits).toHaveLength(2);
    expect(DEFAULTS.timeline).toHaveLength(4);
    expect(DEFAULTS.notes).toHaveLength(5);
  });
  it("keeps the {price} token in the first timeline item", () => {
    expect(DEFAULTS.timeline[0].desc).toContain("{price}");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useBoostContent.test.ts`
Expected: FAIL — module `./useBoostContent` has no such exports.

- [ ] **Step 3: Implement types, DEFAULTS, and helpers**

Create `src/hooks/useBoostContent.ts` with (hook added in Task 3):

```ts
import { Trophy, GraduationCap, Users, BookOpen, Sparkles, Calendar, Award, IndianRupee, type LucideIcon } from "lucide-react";

export const BOOST_CONTENT_ID = "a0000000-0000-0000-0000-0000000b0058";

export type BoostBenefit = { icon: string; title: string; desc: string };
export type ExamRow =
  | { label: string; cells: string[] }
  | { label: string; span: string; href?: string };
export type ExamStructure = {
  paramHeader: string;
  columns: string[];
  rows: ExamRow[];
  legend: string;
  markingScheme: string;
};
export type ScholarshipRow = { score: string; scholarship: string };
export type TimelineItem = { phase: string; date: string; desc: string };
export type Faq = { q: string; a: string };
export type BoostContent = {
  legacy: { badge: string; heading: string; body: string; calloutTitle: string; calloutBody: string };
  benefits: BoostBenefit[];
  examStructure: ExamStructure;
  scholarshipGrid: ScholarshipRow[];
  notes: string[];
  timeline: TimelineItem[];
  faqs: Faq[];
};

export const ICON_MAP: Record<string, LucideIcon> = {
  Trophy, GraduationCap, Users, BookOpen, Sparkles, Calendar, Award, IndianRupee,
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Trophy;
}

export function applyPriceToken(text: string, price: number): string {
  return text.split("{price}").join(String(price));
}

export function isSpanRow(row: ExamRow): row is { label: string; span: string; href?: string } {
  return "span" in row;
}

export function splitScholarship<T>(rows: T[]): [T[], T[]] {
  const mid = Math.ceil(rows.length / 2);
  return [rows.slice(0, mid), rows.slice(mid)];
}

export const DEFAULTS: BoostContent = {
  // ... paste the full "Canonical content" object above, as a typed TS literal.
  // Keep the {price} token in timeline[0].desc. Every field from the JSON must be present.
};
```

Fill `DEFAULTS` with the complete canonical content from the top of this plan (all 7 sections, verbatim).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useBoostContent.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `useBoostContent.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useBoostContent.ts src/hooks/useBoostContent.test.ts
git commit -m "feat(boost): add boost content types, defaults, and helpers"
```

---

## Task 3: `useBoostContent` read hook

**Files:**
- Modify: `src/hooks/useBoostContent.ts` (append the hook)

**Interfaces:**
- Consumes: `BOOST_CONTENT_ID`, `BoostContent`, `DEFAULTS` from Task 2; `supabase` client; `useQuery`.
- Produces: `useBoostContent(): { content: BoostContent; loading: boolean }`.

- [ ] **Step 1: Implement the hook**

Append to `src/hooks/useBoostContent.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBoostContent() {
  const query = useQuery({
    queryKey: ["boost_page_content", BOOST_CONTENT_ID],
    queryFn: async (): Promise<BoostContent> => {
      const { data, error } = await supabase
        .from("boost_page_content" as any)
        .select("content")
        .eq("id", BOOST_CONTENT_ID)
        .maybeSingle();
      if (error) throw error;
      const content = (data as any)?.content;
      return content ? { ...DEFAULTS, ...(content as BoostContent) } : DEFAULTS;
    },
    staleTime: 10 * 60 * 1000,
  });
  return { content: query.data ?? DEFAULTS, loading: query.isPending };
}
```

Put the two new imports at the top of the file with the others.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (`as any` cast avoids the missing generated type, matching `useBoostSettings`.)

- [ ] **Step 3: Confirm existing tests still pass**

Run: `npx vitest run src/hooks/useBoostContent.test.ts`
Expected: PASS (helper tests unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBoostContent.ts
git commit -m "feat(boost): add useBoostContent read hook"
```

---

## Task 4: Refactor `BoostPage` to render from content

**Files:**
- Modify: `src/pages/BoostPage.tsx`

**Interfaces:**
- Consumes: `useBoostContent`, `resolveIcon`, `applyPriceToken`, `splitScholarship`, `isSpanRow` from Task 2/3.

- [ ] **Step 1: Wire the hook and remove inline literals**

At the top of the component, add `const { content } = useBoostContent();` and destructure `const { legacy, benefits, examStructure, scholarshipGrid, notes, timeline, faqs } = content;`. Delete the module-level `const benefits = [...]` and `const faqs = [...]` arrays and the inline `const timeline = [...]` inside the component. Keep `useBoostSettings()` and `useSiteBanner("boost")` as-is.

Replace `b.icon` usage in Benefits with `resolveIcon(b.icon)`:

```tsx
{benefits.map((b) => {
  const Icon = resolveIcon(b.icon);
  return (
    <BansalCard key={b.title} className="hover-lift border border-border/40 p-6 flex flex-col justify-between">
      <div>
        <div className="h-12 w-12 rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-4">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-bold text-bansal-black mb-3">{b.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
      </div>
    </BansalCard>
  );
})}
```

- [ ] **Step 2: Render the Legacy section from `legacy`**

Replace the badge/heading/paragraph/callout literals:

```tsx
<BansalBadge variant="blue" className="mb-4">{legacy.badge}</BansalBadge>
<h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black leading-tight">{legacy.heading}</h2>
{/* right column */}
<p>{legacy.body}</p>
<p className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-bansal-black font-medium">
  <strong>{legacy.calloutTitle}</strong> {legacy.calloutBody}
</p>
```

- [ ] **Step 3: Render the Exam Structure table from `examStructure`**

Replace the hardcoded table body with a data-driven one:

```tsx
<table className="w-full text-sm text-left border-collapse">
  <thead>
    <tr className="bg-bansal-blue text-white font-semibold">
      <th className="p-4 border-b border-border">{examStructure.paramHeader}</th>
      {examStructure.columns.map((c) => (
        <th key={c} className="p-4 border-b border-border">{c}</th>
      ))}
    </tr>
  </thead>
  <tbody className="divide-y divide-border text-bansal-black">
    {examStructure.rows.map((row) => (
      <tr key={row.label} className="hover:bg-muted/30">
        <td className="p-4 font-bold bg-muted/20">{row.label}</td>
        {isSpanRow(row) ? (
          <td colSpan={examStructure.columns.length} className="p-4 text-center font-medium bg-primary/5">
            {row.href ? (
              <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">{row.span}</a>
            ) : row.span}
          </td>
        ) : (
          row.cells.map((cell, ci) => (
            <td key={ci} className="p-4">{cell}</td>
          ))
        )}
      </tr>
    ))}
  </tbody>
</table>
```

Replace the legend/marking-scheme block:

```tsx
<div className="mt-6 space-y-3 bg-muted/40 p-5 rounded-xl border border-border/60 text-xs text-muted-foreground">
  <p><strong className="text-bansal-black">Legend:</strong> {examStructure.legend}</p>
  <p><strong className="text-bansal-black">Marking Scheme:</strong> {examStructure.markingScheme}</p>
</div>
```

- [ ] **Step 4: Render the Scholarship Grid from `scholarshipGrid`**

Replace the two hardcoded tables with an auto-split render:

```tsx
{(() => {
  const [left, right] = splitScholarship(scholarshipGrid);
  const renderTable = (rows: typeof scholarshipGrid, startIndex: number) => (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-md">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-bansal-blue text-white font-semibold">
            <th className="p-3 border-b border-border text-center">Sr.No.</th>
            <th className="p-3 border-b border-border">Score in BOOST</th>
            <th className="p-3 border-b border-border text-center">% Scholarship</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-bansal-black">
          {rows.map((item, i) => (
            <tr key={startIndex + i} className="hover:bg-muted/30">
              <td className="p-3 text-center font-bold bg-muted/10">{startIndex + i + 1}</td>
              <td className="p-3 font-medium">{item.score}</td>
              <td className="p-3 text-center font-bold text-bansal-orange">{item.scholarship}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {renderTable(left, 0)}
      {renderTable(right, left.length)}
    </div>
  );
})()}
```

- [ ] **Step 5: Render Notes, Timeline, and FAQs from data**

Notes (ordered list):

```tsx
<ol className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
  {notes.map((n, i) => (<li key={i}>{n}</li>))}
</ol>
```

Timeline (apply price token to `desc`):

```tsx
{timeline.map((t, i) => (
  <BansalCard key={t.phase} className="relative">
    <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-bansal-orange text-white font-bold flex items-center justify-center text-sm shadow-md">{i + 1}</div>
    <Calendar className="h-5 w-5 text-bansal-blue mb-3" />
    <h3 className="font-display font-bold text-bansal-black">{t.phase}</h3>
    <p className="text-bansal-orange text-xs font-bold uppercase tracking-wide mt-1">{t.date}</p>
    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{applyPriceToken(t.desc, boost.priceInr)}</p>
  </BansalCard>
))}
```

FAQs — replace the existing `.replace(/₹99/g, ...)` logic with the token helper:

```tsx
{faqs.map((f, i) => {
  const question = applyPriceToken(f.q, boost.priceInr);
  const answer = applyPriceToken(f.a, boost.priceInr);
  const isOpen = openFaqIndex === i;
  // ...unchanged accordion markup, using {question} and {answer}
})}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/pages/BoostPage.tsx`
Expected: no errors. Remove now-unused imports (e.g. `Trophy`, `GraduationCap` if no longer referenced directly; `Calendar` is still used).

- [ ] **Step 7: Verify the page renders identically**

Start the dev server (`npm run dev`) and open `/boost`. Confirm all seven sections render with the same content as before (benefits icons present, exam table incl. the "Visit www.bansal.ac.in" link, scholarship 1–5 / 6–10 split, notes numbered, timeline shows the live price, FAQs expand). Use the `verify` skill / browser to drive it.

- [ ] **Step 8: Commit**

```bash
git add src/pages/BoostPage.tsx
git commit -m "feat(boost): render BoostPage sections from dynamic content"
```

---

## Task 5: `BoostContentPanel` admin editor

**Files:**
- Create: `src/components/admin/BoostContentPanel.tsx`

**Interfaces:**
- Consumes: `BOOST_CONTENT_ID`, `BoostContent`, `DEFAULTS`, `ICON_MAP`, `isSpanRow` from Task 2; `supabase`; `toast`.
- Produces: default export `BoostContentPanel` (React component, no props).

- [ ] **Step 1: Implement the panel scaffold (load + save whole document)**

Create `src/components/admin/BoostContentPanel.tsx`. Load the row on mount into local state `draft: BoostContent` (fall back to `DEFAULTS`), and a single `save()` that writes the whole object:

```tsx
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BOOST_CONTENT_ID, DEFAULTS, ICON_MAP, isSpanRow, type BoostContent } from "@/hooks/useBoostContent";

export default function BoostContentPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BoostContent>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("boost_page_content" as any)
        .select("content")
        .eq("id", BOOST_CONTENT_ID)
        .maybeSingle();
      if (error) toast.error(error.message);
      const content = (data as any)?.content;
      if (content) setDraft({ ...DEFAULTS, ...(content as BoostContent) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("boost_page_content" as any)
      .update({ content: draft })
      .eq("id", BOOST_CONTENT_ID);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("BOOST page content saved");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading BOOST page content…
      </div>
    );
  }

  // sections rendered in Steps 2–4, then the Save button
}
```

- [ ] **Step 2: Add the simple-list editors (Legacy, Benefits, Notes, Timeline, FAQs, Scholarship Grid)**

Add small update helpers and per-section UIs inside the component. Use array map/patch (no dnd-kit required for v1 — reordering can be add/remove; ordering is by array position, and up/down buttons are enough). Provide add / edit / remove for each list. Example patterns:

```tsx
const setLegacy = (patch: Partial<BoostContent["legacy"]>) =>
  setDraft((d) => ({ ...d, legacy: { ...d.legacy, ...patch } }));

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
};
```

- **Legacy:** 5 inputs bound to `draft.legacy` via `setLegacy`.
- **Benefits:** map `draft.benefits`; each row = `<select>` of `Object.keys(ICON_MAP)` for `icon`, text input for `title`, textarea for `desc`, remove button; "Add benefit" pushes `{ icon: "Trophy", title: "", desc: "" }`.
- **Notes:** map `draft.notes`; each = textarea + up/down/remove; "Add note" pushes `""`.
- **Timeline:** map `draft.timeline`; each = inputs for `phase`, `date`, `desc` + up/down/remove; add pushes `{ phase: "", date: "", desc: "" }`. Show a hint that `{price}` is replaced by the live price.
- **FAQs:** map `draft.faqs`; each = input `q` + textarea `a` + up/down/remove; add pushes `{ q: "", a: "" }`.
- **Scholarship Grid:** map `draft.scholarshipGrid`; each = inputs `score`, `scholarship` + up/down/remove; add pushes `{ score: "", scholarship: "" }`. Note that Sr.No and the two-column split are automatic.

All list edits update `draft` immutably, e.g.:

```tsx
const updateFaq = (i: number, patch: Partial<BoostContent["faqs"][number]>) =>
  setDraft((d) => ({ ...d, faqs: d.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
```

- [ ] **Step 3: Add the Exam Structure editor**

Edit `paramHeader`, `legend`, `markingScheme` (inputs). Columns: map `draft.examStructure.columns`, each an input with a remove button; "Add column" appends a header AND appends an empty cell to every `cells`-row. Removing a column removes that index from every `cells`-row. Rows: for each row, an input for `label`, a toggle "spans all columns"; when spanning show a `span` text input + optional `href` input; otherwise show one input per column bound to `cells[i]`. Reconciliation helpers:

```tsx
const es = draft.examStructure;
const setEs = (patch: Partial<typeof es>) =>
  setDraft((d) => ({ ...d, examStructure: { ...d.examStructure, ...patch } }));

const addColumn = () =>
  setEs({
    columns: [...es.columns, "New Column"],
    rows: es.rows.map((r) => (isSpanRow(r) ? r : { ...r, cells: [...r.cells, ""] })),
  });

const removeColumn = (ci: number) =>
  setEs({
    columns: es.columns.filter((_, j) => j !== ci),
    rows: es.rows.map((r) => (isSpanRow(r) ? r : { ...r, cells: r.cells.filter((_, j) => j !== ci) })),
  });

const toggleSpan = (ri: number) =>
  setEs({
    rows: es.rows.map((r, j) => {
      if (j !== ri) return r;
      if (isSpanRow(r)) return { label: r.label, cells: es.columns.map(() => "") };
      return { label: r.label, span: "" };
    }),
  });
```

Add a "Add row" button that pushes `{ label: "", cells: es.columns.map(() => "") }`.

- [ ] **Step 4: Add the Save button**

```tsx
<div className="mt-5 flex justify-end">
  <button onClick={save} disabled={saving}
    className="inline-flex items-center gap-2 rounded-lg bg-bansal-orange text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save page content
  </button>
</div>
```

Wrap the whole panel in the same card styling as `BoostSettingsPanel` (`rounded-xl border border-border bg-card p-5 mb-6`), with a header row (`<FileText className="h-5 w-5 text-bansal-orange" />` + title "BOOST Page Content" + subtitle "Edit the public /boost page sections."). Group each section under a labeled sub-heading; consider `<details>`/`<summary>` collapsibles to keep it compact.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BoostContentPanel.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/BoostContentPanel.tsx
git commit -m "feat(boost): add BoostContentPanel admin editor"
```

---

## Task 6: Mount the editor in `AdminBoostPage` and verify end-to-end

**Files:**
- Modify: `src/pages/AdminBoostPage.tsx`

**Interfaces:**
- Consumes: `BoostContentPanel` from Task 5.

- [ ] **Step 1: Render the panel**

Import and mount it directly below `<BoostSettingsPanel />` (line ~146):

```tsx
import BoostContentPanel from "@/components/admin/BoostContentPanel";
// ...
<BoostSettingsPanel />
<BoostContentPanel />
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end verification (use the `verify` skill / browser)**

As an `admin` or `super_admin`, open `/admin/boost`:
1. The "BOOST Page Content" panel loads with the seeded values populated.
2. Edit one field per section type (e.g. change a benefit title, add a scholarship row, add a timeline item with `{price}` in desc, add an exam column, toggle a row to span). Save → success toast.
3. Open `/boost` in another tab (or reload) → changes appear; the added exam column shows in the table with each row reconciled; the new scholarship row re-balances the two-column split; the `{price}` token shows the live price.
4. Confirm a `center_admin` cannot reach `/admin/boost` (not in their nav) and that a direct write is blocked by RLS (optional: attempt an `update` as a non-admin via console → expect RLS error).

- [ ] **Step 4: Run the full test + build check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminBoostPage.tsx
git commit -m "feat(boost): mount BoostContentPanel in admin BOOST page"
```

---

## Self-Review notes

- **Spec coverage:** legacy ✓ (T2 DEFAULTS, T4 render, T5 editor), benefits ✓, exam structure ✓ (incl. span rows + link via `href`, column reconciliation T5.3), scholarship grid ✓ (auto-split T2 helper + T4.4 render + T5.2 editor), notes ✓, timeline ✓ (incl. `{price}` token), faqs ✓. Storage/RLS ✓ (T1). Read hook + DEFAULTS fallback ✓ (T2/T3). HQ-only edit ✓ (RLS in T1 + panel only on HQ nav in T6).
- **Permission scope:** `admin OR super_admin` per approved spec.
- **Type consistency:** `BoostContent`, `ExamRow`, `isSpanRow`, `splitScholarship`, `applyPriceToken`, `resolveIcon`, `BOOST_CONTENT_ID` names are used identically across Tasks 2–6.
- **No placeholders:** the only intentional "paste the canonical content" instructions (T1 seed, T2 DEFAULTS) point to the fully-specified JSON block at the top of this plan.
