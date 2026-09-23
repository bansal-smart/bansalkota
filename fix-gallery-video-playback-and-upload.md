# Bug: Gallery videos won't play (existing) and won't upload (new) — /gallery/videos

## Context
The public Video Gallery page (`/gallery/videos`) shows several video cards (e.g. "Bansal Aunty's
Birthday - 17/12/2025", "New Year Celebration 2026", "Makar Sankranti - 2026") — but every video
player shows a blank black frame and **`0:00` duration**, meaning the browser never successfully
loaded video metadata at all. This isn't a "video plays badly" issue — it's a "video source never
loaded" issue, visible across every single video card on the page, not just one.

The client also reports being unable to **upload** new videos via the admin Gallery management
panel. Treat these as two related but separately-diagnosable problems — the playback issue is
about existing stored files, the upload issue is about the admin write path — and find the actual
cause of each rather than assuming they share one root cause.

## What I need you to do

### 1. Diagnose the playback issue first (existing videos)
- Open the Video Gallery page and check the browser Network tab / console for the actual `<video>`
  element's `src` requests. Confirm:
  - Is the request reaching a real URL at all, or is `src` empty/malformed?
  - If it reaches a URL, what HTTP status comes back — 403 (permissions), 404 (missing file), CORS
    error, or a redirect loop?
- Check where video files are actually stored (almost certainly Supabase Storage, per this
  project's pattern elsewhere) and confirm:
  - Is the storage bucket used for gallery videos set to **public** read access, or does it
    require a signed URL that the frontend isn't correctly requesting/attaching?
  - Are the stored files' content-type/MIME type set correctly for video (e.g. `video/mp4`)? A
    wrong content-type can cause a browser to refuse to treat the response as playable video even
    if the bytes are fine.
  - Confirm the actual files exist in storage at the path the database record points to — check
    for a mismatch between what's recorded in the `gallery_videos` (or equivalent) table and
    what's actually present in the bucket (e.g. files that were referenced but never successfully
    uploaded, or a bucket/path renamed after these records were created).

### 2. Diagnose the upload issue (admin write path)
- Find the admin Gallery video upload flow and attempt to reproduce the failure.
- Check for:
  - A file size limit being silently exceeded (video files are often much larger than the images
    this admin panel is mostly built around — confirm whether Supabase Storage's bucket size limit
    or the client-side upload code's own limit is too small for real video files, and whether a
    failure surfaces a clear error or fails silently).
  - Whether the upload path is actually configured for video content-type at all, or was only ever
    built/tested for images (this project's Page Banners/Cover Image work was all image-focused —
    check if video upload is reusing image-upload code that doesn't handle video correctly, e.g.
    wrong accepted MIME types on the file input, or an image-processing step choking on a video
    file).
  - Whether the upload times out for larger files (videos take longer to upload than images — check
    if there's a client or server-side timeout too short for realistic video file sizes).
- Reproduce with a real test video file and capture the actual error (network response, console
  error) rather than assuming a cause.

### 3. Fix both, addressing the real causes found in steps 1–2
- Fix storage bucket permissions/content-type/path issues for existing video playback.
- Fix the upload flow so it correctly accepts, uploads, and stores video files with correct
  content-type and a realistic size/timeout allowance.
- For the existing broken video records (the ones currently showing 0:00): determine whether the
  original video files can be found and correctly re-linked, or whether they were never actually
  successfully stored and need to be re-uploaded by the client — report which case applies rather
  than assuming.

### 4. Verify
- Confirm at least one existing video (or a freshly re-uploaded one) plays correctly on the public
  Video Gallery page — real duration shown, playback works.
- Confirm uploading a new video through the admin panel succeeds end-to-end and the new video
  immediately plays correctly on the public page.
- Test with a realistically-sized video file (not a tiny test clip) to confirm size/timeout limits
  are actually fixed, not just technically increased without real-world testing.

## Deliverable
- Root cause of playback failure (storage permissions, content-type, or missing/mismatched files —
  confirmed, not assumed).
- Root cause of upload failure (size limit, wrong MIME handling, timeout, or reused image-only
  code path).
- Both fixed and verified with a real video file, and a clear answer on whether existing broken
  video records are recoverable or need re-upload.
