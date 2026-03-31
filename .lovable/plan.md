

## Plan: Remove Hindi, Replace Emojis with Icons, Update Color Theme to Orange

### Summary
Remove all Hindi text across pages, replace emoji usage with professional Lucide icons, and shift the color theme from blue-primary to a warm orange-based palette that's attractive but easy on the eyes.

### 1. Color Theme Overhaul

Update CSS variables in `src/index.css` to an orange-warm palette:

| Token | Old (Blue) | New (Orange/Warm) |
|-------|-----------|-------------------|
| `--primary` | `222 81% 58%` (blue) | `24 95% 53%` (warm orange #F97316) |
| `--primary-dark` | `222 72% 47%` | `21 90% 48%` (#E86511) |
| `--primary-light` | `225 100% 96%` | `33 100% 96%` (#FFF7ED) |
| `--background` | `225 100% 97%` | `30 50% 97%` (warm off-white) |
| `--ring` | blue | match new primary |
| `--shadow-blue` | blue glow | orange glow `rgba(249,115,22,0.2)` |
| `--sidebar-primary/accent` | blue refs | orange refs |

Also update `src/styles/design-tokens.ts` to match the new orange palette. Keep teal for success, navy for dark sections. The accent becomes a deep amber/gold.

### 2. Remove All Hindi Text

**LandingPage.tsx:**
- Line 40-41: Replace "शुरुआत करो, मंज़िल पाओ" → "Start Your Journey," / "Reach Your Goals"
- Line 122: Replace "सब कुछ एक जगह" → "Everything in One Place"
- Line 223: Replace "अभी शुरू करो" → "Start Now"

**LoginPage.tsx:**
- Line 37: Replace "शुरुआत करो, मंज़िल पाओ" → "Start Now, Reach Your Destination"

**SignupPage.tsx:**
- Line 19: Same Hindi tagline replacement

### 3. Replace All Emojis with Lucide Icons

Every emoji will be replaced with a properly styled Lucide icon in a colored container:

| Location | Emoji | Replacement Icon |
|----------|-------|-----------------|
| Landing hero badge | 🚀 | `Rocket` icon |
| Stats bar | 📚🎓📝🏆 | `BookOpen`, `GraduationCap`, `FileText`, `Trophy` |
| Trust badges | 📚📺🏆 | `Users`, `Monitor`, `Award` |
| Phone mockup streak | 🔥 | `Flame` icon |
| Footer | ❤️ | `Heart` icon (fill) |
| Dashboard greeting | 👋 | Remove (just text) |
| Dashboard counsellor btn | 📞 | `PhoneCall` icon |
| Schedule subject icons | ⚡🧪📐 | `Zap`, `FlaskConical`, `Compass` |
| Educator cards | ⚡🧪📐 | Same Lucide icons in styled containers |
| Login/Signup | 👋🚀 | Remove emoji from headings |
| Sparkle decorations | ✦ | SVG diamond/sparkle shape or `Sparkles` icon |
| Country flags | 🇮🇳🇦🇪 | Text labels "IN +91" / "AE +971" |

### 4. Alignment & Polish Fixes

- Ensure consistent padding/gaps across all stat cards, schedule items, and form fields
- Standardize border-radius usage (rounded-xl for cards, rounded-lg for inputs)
- Fix icon containers to uniform 40x40 or 48x48 sizing with consistent padding
- Ensure mobile bottom nav icons are perfectly centered
- Calendar widget: uniform cell sizing

### 5. Files to Modify

1. **`src/index.css`** — Update all CSS custom properties to orange palette
2. **`src/styles/design-tokens.ts`** — Update color values
3. **`src/pages/LandingPage.tsx`** — Remove Hindi, replace emojis with Lucide icons, update gradient references
4. **`src/pages/LoginPage.tsx`** — Remove Hindi tagline, remove emojis from headings, fix flag emojis
5. **`src/pages/SignupPage.tsx`** — Same as LoginPage
6. **`src/pages/StudentDashboard.tsx`** — Replace all emojis with Lucide icons in schedule, educators, buttons
7. **`src/components/GoalSelector.tsx`** — Replace 🎯 with `Target` icon
8. **`tailwind.config.ts`** — Update shadow references if needed

### Color Palette Preview

```text
Primary:     #F97316 (Vibrant Orange)
Primary Dark: #E86511 (Deep Orange)
Primary Light: #FFF7ED (Cream)
Background:  #FFFBF5 (Warm White)
Teal:        #08BD80 (unchanged — success)
Navy:        #1E293B (slightly lighter for softer contrast)
Accent:      #F59E0B (Gold — kept for achievements)
```

This creates a warm, inviting, and professional feel without being harsh on the eyes.

