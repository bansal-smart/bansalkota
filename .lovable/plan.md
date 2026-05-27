## Plan: Restructure courses to match Bansal's real catalog (19 courses)

Replace the current 12 courses with the actual Bansal Classes lineup: **JEE (7), NEET (6), Pre-Foundation (6)**. Each JEE/NEET program (Bulls Eye / Nucleus / Sterling) gets both an **offline** and **online** variant; Pre-Foundation gets the NEEV series + 1 online ZENITH.

### Final course list (19)

**JEE — 7 courses**
| Slug | Name | Class | Mode | Price |
|---|---|---|---|---|
| `bulls-eye-jee-offline` | BULL'S EYE for JEE | 11th | Offline | ₹1,35,700 |
| `bulls-eye-jee-online` | ONLINE BULLS EYE (XI) for JEE | 11th | Online | ₹21,000 |
| `nucleus-jee-offline` | NUCLEUS for JEE | 12th | Offline | ₹1,51,039 |
| `nucleus-jee-online` | ONLINE NUCLEUS (XII) for JEE | 12th | Online | ₹21,000 |
| `sterling-jee-offline` | STERLING for JEE | Dropper | Offline | ₹1,51,040 |
| `sterling-jee-online` | ONLINE STERLING (XII Pass) for JEE | Dropper | Online | ₹21,000 |
| `jee-free-content` | JEE FREE CONTENT | All | Online | Free |

**NEET — 6 courses**
| Slug | Name | Class | Mode | Price |
|---|---|---|---|---|
| `bulls-eye-neet-offline` | BULL'S EYE for NEET | 11th | Offline | ₹1,35,700 |
| `bulls-eye-neet-online` | ONLINE BULLS EYE (XI) for NEET | 11th | Online | ₹21,000 |
| `nucleus-neet-offline` | NUCLEUS for NEET | 12th | Offline | ₹1,51,040 |
| `nucleus-neet-online` | ONLINE NUCLEUS (XII) for NEET | 12th | Online | ₹21,000 |
| `sterling-neet-offline` | STERLING for NEET | Dropper | Offline | ₹1,51,040 |
| `sterling-neet-online` | ONLINE STERLING (XII Pass) for NEET | Dropper | Online | ₹21,000 |

**Pre-Foundation — 6 courses**
| Slug | Name | Class | Mode | Price |
|---|---|---|---|---|
| `neev-x-zenith-offline` | NEEV – X (ZENITH) | 10th | Offline | ₹54,280 |
| `neev-x-zenith-online` | ONLINE ZENITH for Class X | 10th | Online | ₹11,000 |
| `neev-ix-pearl` | NEEV – IX (PEARL) | 9th | Offline | ₹49,560 |
| `neev-viii-octagon` | NEEV – VIII (OCTAGON) | 8th | Offline | ₹42,480 |
| `neev-vii-brilliant` | NEEV – VII (BRILLIANT) | 7th | Offline | ₹36,580 |
| `neev-vi-genius` | NEEV – VI (GENIUS) | 6th | Offline | ₹33,040 |

### Banner thumbnails (reuse what we already have + generate the rest)

The 12 banners already generated map 1:1 onto the **offline** flagships where possible. We will **reuse** existing art and only generate **new banners for the new variants**, keeping the same color system (JEE = Bansal blue, NEET = green, Pre-Foundation = sky blue) — online variants get the same base art with an "ONLINE" ribbon overlay so they read as a sibling at a glance.

- Reuse existing: Bulls Eye JEE/NEET offline (11), Nucleus JEE/NEET offline (12), Sterling JEE/NEET offline (Dropper), NEEV VI/VII/VIII, ONLINE ZENITH base from `udaan-class-10.jpg` repurposed as `neev-x-zenith-offline`.
- Generate new (premium tier, 1536×1024, same composition language):
  - 6 ONLINE variants (Bulls Eye/Nucleus/Sterling × JEE/NEET) — same color per category, "ONLINE" badge top-right, laptop/streaming motif on right
  - 1 ONLINE ZENITH (Class X) — sky blue, laptop motif
  - 1 NEEV-IX PEARL — sky blue, pearl/gem motif
  - 1 JEE FREE CONTENT — JEE blue, "FREE" ribbon

That is ~9 new images.

### Database changes

One migration in two parts:
1. **Wipe & repopulate** — `DELETE FROM courses` (safe: no enrollments in production yet; if any exist we'll instead `UPDATE` matching slugs and `INSERT` the rest, but the cleanest path is delete+insert since 8 of the 12 slugs are renamed).
2. **Insert 19 rows** with the slug/name/price/target_exam/level shown above, plus `description` (the short class line from your spec), `subject` = "All Subjects", `educator_name` = "Bansal Faculty", `thumbnail_url` pointing at `/courses/<slug>.jpg`.

`target_exam` values used: `JEE`, `NEET`, `Foundation`. `level` will store the class/batch label (`11th Class`, `12th Class`, `Dropper`, `10th Class`, etc.) so the cards can show "Batch: offline | Class: 11th Class" exactly like your reference.

### CoursesPage filter fix

`CoursesPage` already has Online/Offline filters but currently relies on detecting the word in the name. Since every new course has "Online" or no marker in its name, this keeps working — no UI changes required. Mode chip on the card stays driven by `detectMode()`.

### Out of scope
- No new columns (we encode mode in the name + level field).
- No changes to enrollment/payment flow.
- No CourseDetailPage layout changes — it already reads `thumbnail_url` + `level`.
- Educator name stays generic "Bansal Faculty" — no per-course assignment.

### One open decision

The current DB has **no `mode` column**; we're piggybacking on the name + `level`. If you'd rather have a clean `mode` enum (`online` / `offline`) for filtering and badges, say the word and I'll add a column in the same migration — but it's not required to ship the catalog.
