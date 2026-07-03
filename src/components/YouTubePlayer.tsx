import { useMemo } from "react";

/**
 * Embedded YouTube player with native YouTube UI suppressed as far as
 * possible: no related videos, no title bar, no "Watch on YouTube" link
 * (covered by transparent overlays), no keyboard shortcuts, no channel
 * annotations. Playback controls remain functional.
 */
export function YouTubePlayer({
  videoId,
  title,
  autoplay = true,
}: {
  videoId: string;
  title?: string;
  autoplay?: boolean;
}) {
  const src = useMemo(() => {
    const params = new URLSearchParams({
      modestbranding: "1",
      rel: "0",
      showinfo: "0",
      iv_load_policy: "3",
      fs: "1",
      playsinline: "1",
      cc_load_policy: "0",
      disablekb: "1",
      autoplay: autoplay ? "1" : "0",
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [videoId, autoplay]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg">
      <iframe
        key={videoId}
        src={src}
        title={title || "Video"}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder={0}
      />
      {/*
        Overlay strips that block clicks on the title bar and the
        "Watch on YouTube" link (top-right when paused). These do NOT
        cover the main click-to-play area or the bottom controls bar.
      */}
      <div
        className="absolute top-0 left-0 right-0 h-14 z-10"
        style={{ pointerEvents: "auto", background: "transparent" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}

export default YouTubePlayer;
