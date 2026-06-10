# NTA/JEE-style CBT Test Screen

Make `TestTakingPage.tsx` look and feel exactly like the official NTA / JEE / NEET CBT interface. All required logic (auto-save, timer, mark-for-review, numeric keypad, image zoom, LaTeX, submit summary) already exists — this plan is a UI/UX restructure plus a few small interaction upgrades, not a rewrite of test mechanics.

---

## Reference layout (NTA)

```
+--------------------------------------------------------------+
| LOGO  Test Name                       Candidate: Name  [pic] |
+--------------------------------------------------------------+
| Remaining: 02:59:47                    View Instructions ⓘ   |
+--------------------------------------------------------------+
| [Physics] [Chemistry] [Maths]                Section: A | B  |
+--------------------------------------------------------------+
|                                  |  Candidate photo + name   |
| Question No. 12                  |---------------------------|
| Marks: +4, -1   Type: MCQ        |  ⬛ 2 Not Visited         |
|                                  |  🟥 4 Not Answered        |
| <question text + image>          |  🟩 6 Answered            |
|                                  |  🟪 3 Marked              |
| ◯ A. option                      |  🟪✓ 1 Ans & Marked       |
| ◯ B. option                      |---------------------------|
| ◯ C. option                      |  PHYSICS — SECTION A      |
| ◯ D. option                      |  [1][2][3][4][5][6][7][8] |
|                                  |  [9][10][11][12]...       |
|                                  |  CHEMISTRY — SECTION A    |
|                                  |  [1][2][3]...             |
+--------------------------------------------------------------+
| [Mark & Next] [Clear] [Save & Mark]   [Back] [Save & Next]   |
|                                                   [Submit]   |
+--------------------------------------------------------------+
```

Color/shape legend (NTA spec — same colors we already use):
- 🟩 pentagon = Answered
- 🟥 inverted pentagon = Not Answered
- 🟪 circle = Marked for Review
- 🟪 circle + green tick = Answered & Marked (will be evaluated)
- ⬜ square = Not Visited

---

## Changes

### 1. Top bars (3 stacked strips)
- **Strip 1** — exam logo (Flame icon), test title, candidate avatar + name (from `profiles`).
- **Strip 2** — large remaining-time pill on the right, "View Instructions" link that re-opens the pre-test instructions modal.
- **Strip 3** — subject tabs (Physics / Chemistry / Maths / Biology). Active tab = primary background. Auto-jumps to the first question of that subject when clicked. "ALL" tab dropped — NTA never shows it.

### 2. Question area (left, 70%)
- "Question No. X" big heading + a `Question Type: ...` and `Marks: +M, -N` row in NTA grey.
- Stem rendered through existing `MathRenderer` (already LaTeX/mhchem).
- Inline image, click to open existing `zoomImg` modal — add scroll-wheel zoom in modal (small win).
- Single MCQ options → circular radio; Multi → square checkbox; Numerical → existing keypad with a single bordered input.
- Long-question scroll inside the card; everything else stays fixed (NTA fixed-frame feel).

### 3. Right rail (320 px, fixed scroll)
- **Candidate card** — avatar circle + name + roll-no placeholder.
- **Legend strip** — five rows with shaped icons (`AnsweredShape`, `NotAnsweredShape`, `MarkedShape`, `AnsweredMarkedShape`, `NotVisitedShape` — small SVG components) and counts.
- **Per-subject palette sections** — for each subject in order: heading "PHYSICS — SECTION A" then the numbered grid. Buttons reuse current shape components. Active question pulsing primary ring. Click jumps to that question, even if it's in another subject (auto-switches the active subject tab).

### 4. Bottom action bar (sticky)
Two groups, NTA order:
- Left: `Mark for Review & Next`, `Clear Response`, `Save & Mark for Review`
- Right: `← Back`, `Save & Next`, then a red `Submit` button at the far right.
Keyboard shortcuts: `←`/`→`, `M` = mark, `C` = clear, `Enter` = save & next.

### 5. Submit summary modal
Already exists — restyle to NTA wording:
- Header "Are you sure you want to submit for evaluation?"
- Grid of 6 status rows with shape icons + counts.
- Yes/No buttons, Yes = red.

### 6. Small interaction polish
- Auto-save indicator dot in the time strip ("Saved 3s ago" — fades).
- Pressing `Save & Next` flips `not-answered` → `answered` only when there is a real answer (already does).
- Image zoom modal: pinch zoom on mobile (CSS), + and − buttons on desktop.
- Right-rail collapses to a bottom sheet on `< lg`; toggle button in Strip 2.

---

## Files

**Edited**
- `src/pages/TestTakingPage.tsx` — full UI restructure inside the same component, reusing all existing state + handlers.

**New (small UI helpers)**
- `src/components/test/PaletteShape.tsx` — 5 small SVG status shapes used in palette and legend.
- `src/components/test/CandidateCard.tsx` — right-rail header with avatar + name.

## Out of scope
- Any change to scoring, RPC, schemas, RLS, auto-save cadence, or routing.
- Hindi/English language switch (NTA has one; we don't have translations).
- Calculator / scientific keypad (the numeric keypad we have stays as-is).
- Per-question time analytics (already captured; no UI change here).
- Admin-side changes.
