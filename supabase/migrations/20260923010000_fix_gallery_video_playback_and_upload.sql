-- Fix gallery videos: upload cap + orphaned records.
--
-- Root causes (confirmed against live data, not assumed):
--
-- 1. Upload failure: no bucket in this project has ever set an explicit
--    storage.buckets.file_size_limit, so every bucket (including
--    'site-content', used by the admin Gallery video upload) falls back to
--    the low platform default (~50MB). Gallery images (this admin panel's
--    main use case) are well under that, which is why image uploads work
--    fine, but real event-video files routinely exceed it, so every video
--    upload attempt is rejected before the object is ever written. Raise the
--    bucket's file_size_limit explicitly so realistic video files fit.
--
-- 2. Playback failure (existing videos): the 5 gallery_albums video rows
--    were created 2026-06-26, but the 'site-content' bucket itself was only
--    created 2026-07-02 — i.e. before the bucket (in its current form)
--    existed. storage.objects has zero rows under gallery/videos/ for this
--    bucket, ever. These files were never durably stored here and cannot be
--    recovered from this project; the underlying originals must be
--    re-uploaded by the client. Deactivate those broken rows so the public
--    Video Gallery stops showing black/0:00 players, without deleting the
--    rows (titles/order are kept for the admin to re-upload into).

update storage.buckets
set file_size_limit = 524288000 -- 500MB, well above the previous unset (~50MB) default
where id = 'site-content';

update public.gallery_albums ga
set is_active = false,
    updated_at = now()
where ga.kind = 'video'
  and ga.video_url like '%/storage/v1/object/public/site-content/%'
  and not exists (
    select 1 from storage.objects so
    where so.bucket_id = 'site-content'
      and so.name = substring(ga.video_url from '/site-content/(.*)$')
  );
