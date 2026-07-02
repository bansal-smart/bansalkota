# Plan

## 1. Bulk CBT passwords for ALL students (not just current page)

Today `runBulkGenerate("filtered")` sends only `rows` (the paginated 25 shown on screen), so only 25 get generated.

**Fix in `AdminStudentsPage.tsx`:**
- Replace the "filtered" path with a full fetch: re-run the same query used by `load()` (same centre / batch / search / role filters) but **without pagination**, selecting only `user_id`. Collect every matching id.
- Show progress: send to the edge function in **chunks of 200** ids, accumulate `results`, and update a "Processing X / Y…" indicator while running.
- Keep the current confirm dialog copy but update the count shown to reflect the full filtered total (not `rows.length`).
- CSV download already iterates `pwdBulkResults`, so it will include everyone automatically.

Edge function (`admin-bulk-cbt-passwords`) already loops server-side and works with any batch size, so no changes needed there.

## 2. Remove "Course Content" from the admin sidebar

- `src/components/AdminLayout.tsx` line 64 — remove the `{ label: "Course Content", … }` entry.
- `src/lib/adminModules.ts` line 27 — remove the `course_content` module entry so it disappears from Role Permissions too.
- Leave the route + `AdminCourseContentPage` file in place (legacy `/admin/courses/:courseId/chapters` still references it) so nothing else breaks.

## 3. Rebuild the student "My Course" learn page to match the admin content-manager layout

Rewrite `src/pages/CourseLearnPage.tsx` to mirror `AdminCourseHierarchyPage.tsx`'s two-pane layout (read-only for students):

**Left pane — Content Tree**
- Subjects list with video counts (e.g. `INORGANIC CHEMISTRY · 123 videos`), matching the admin style — same typography, spacing, and hover states.
- Clicking a subject opens topics inline (`01-Chemical Bonding · 53 videos · 0 PDFs`).
- Overall progress bar stays at the top.

**Right pane — Topic detail**
- When a topic is selected, show breadcrumb (`SUBJECT › TOPIC`), then tabs `Videos (n)` / `PDFs (n)` — identical to admin.
- Video rows show the **full title** on one line (no truncation to `…`), thumbnail on the left (YouTube mqdefault), duration/subtopic label under it, completion check on the right. Wide layout so titles are readable at the size shown in image 2.
- PDF tab lists downloadable PDFs.

**Video playback → modal**
- Clicking a video row opens a centered **Dialog** (shadcn) containing the custom player (see §4), title, breadcrumb, and a "Mark as Complete / Incomplete" button. Notes textarea moves inside this modal below the player.
- URL still syncs `?video=<id>` so deep links open the modal on load.
- Closing the modal returns to the topic list.

**Mobile**
- Same content tree in a `Sheet` (already exists); topic detail becomes full-width; modal stays centered.

## 4. Branding-free in-app video player (no "Watch on YouTube")

Replace the raw `<iframe src={getYouTubeEmbedUrl(...)}>` with a new component `src/components/YouTubePlayer.tsx`:

- Load the YouTube IFrame API once (`https://www.youtube.com/iframe_api`) with a small loader utility.
- Instantiate `new YT.Player(el, { videoId, host: "https://www.youtube-nocookie.com", playerVars: { controls: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0, playsinline: 1 } })`.
- Render our own control bar (play/pause, seek slider bound to `getCurrentTime` / `seekTo`, current/duration time, mute, volume, fullscreen on the container `requestFullscreen()`).
- Overlay a transparent, click-swallowing `div` on top of the iframe that only lets pointer events through to our controls. This hides the "Watch on YouTube" and title chip that appear on hover/pause, because the iframe never receives clicks.
- Expose `onEnded` / `onStateChange` so completion can auto-mark (kept optional — the manual "Mark Complete" button stays).
- Progress ticker (every 5s) still calls `upsertVideoProgress` so streaks/continue-learning keep working.

Use this component in the new modal in `CourseLearnPage.tsx`. No other pages change.

## Technical notes / files touched

- `src/pages/AdminStudentsPage.tsx` — bulk-generate over all filtered ids in chunks.
- `src/components/AdminLayout.tsx`, `src/lib/adminModules.ts` — drop Course Content nav item.
- `src/pages/CourseLearnPage.tsx` — full rewrite of layout; modal-based playback; full titles.
- `src/components/YouTubePlayer.tsx` — new custom player using YT IFrame API + custom controls + click-blocking overlay.
- No DB or edge-function changes.
