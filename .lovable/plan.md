## Plan: Compact + Scrollable Question Palette

### Problem
The right-side question-number palette in the CBT exam uses 40 px boxes (PaletteShape default). With ~30+ questions per subject, the grid pushes the panel tall and the entire right rail scrolls. We need smaller boxes and an independent scroll container just for the numbered boxes so the overall right-rail height stays fixed.

### Changes

**1. Reduce PaletteShape size**
- In `TestTakingPage.tsx` where `<PaletteShape>` is rendered (line 756), pass `size={28}` (or 32) to shrink each box.
- Adjust the grid columns from `grid-cols-5` to `grid-cols-6` or `grid-cols-7` so more boxes fit per row and the overall width of the palette stays balanced within the 300 px right rail.

**2. Constrain + scroll only the number grid**
- Wrap the `grid` div (lines 752-761) in a new container with:
  - `max-h-[320px]` (or `max-h-[280px]` after testing)
  - `overflow-y-auto`
  - `pr-1` for scrollbar padding
- Keep the subject switcher pills, legend, and candidate card above this container so they remain visible while the student scrolls through question numbers.
- Ensure the outer `aside` keeps `flex flex-col` and the scrollable grid area flexes correctly.

**3. Touch-ups**
- Verify the active-question outline on the smaller shape still reads clearly at 28 px.
- Ensure `gap-2` or `gap-1.5` still looks okay with smaller boxes.

### Expected Result
- Right rail stays at a predictable height regardless of question count.
- Students see subject pills + legend fixed at top, then a compact scrollable grid of small question-number boxes below.
- No change to data logic, status colors, or subject switching behavior.