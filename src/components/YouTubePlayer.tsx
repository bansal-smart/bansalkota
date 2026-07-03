import { useEffect, useRef, useState, useCallback, useId } from "react";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize,
  Captions, Settings, Loader2,
} from "lucide-react";

// Minimal shape of the YouTube IFrame Player API we rely on.
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (v: number) => void;
  getVolume: () => number;
  getPlayerState: () => number;
  getAvailableQualityLevels: () => string[];
  getPlaybackQuality: () => string;
  setPlaybackQuality: (q: string) => void;
  getOption: (module: string, option: string) => unknown;
  setOption: (module: string, option: string, value: unknown) => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;
const loadYouTubeApi = (): Promise<void> => {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiLoadPromise;
};

const QUALITY_LABELS: Record<string, string> = {
  hd2160: "4K", hd1440: "1440p", hd1080: "1080p", hd720: "720p",
  large: "480p", medium: "360p", small: "240p", tiny: "144p", auto: "Auto",
};

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
};

export function YouTubePlayer({
  videoId,
  title,
  autoplay = true,
}: {
  videoId: string;
  title?: string;
  autoplay?: boolean;
}) {
  const domId = useId().replace(/[:]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number>();

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [seeking, setSeeking] = useState(false);
  const [qualities, setQualities] = useState<string[]>([]);
  const [quality, setQuality] = useState<string>("auto");
  const [captionTracks, setCaptionTracks] = useState<{ languageCode: string; displayName: string }[]>([]);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  // Create the player once.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      const player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          autoplay: autoplay ? 1 : 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            setReady(true);
            setDuration(player.getDuration());
            setVolume(player.getVolume());
            setMuted(player.isMuted());
            const levels = player.getAvailableQualityLevels();
            setQualities(levels);
            try {
              const list = player.getOption("captions", "tracklist") as
                | { languageCode: string; displayName: string }[]
                | undefined;
              if (Array.isArray(list)) setCaptionTracks(list);
            } catch { /* captions module not loaded yet */ }
            if (autoplay) player.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            if (cancelled || !window.YT) return;
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.PLAYING) {
              setDuration(player.getDuration());
              setQualities((prev) => (prev.length ? prev : player.getAvailableQualityLevels()));
              try {
                const list = player.getOption("captions", "tracklist") as
                  | { languageCode: string; displayName: string }[]
                  | undefined;
                if (Array.isArray(list) && list.length) setCaptionTracks(list);
              } catch { /* captions module not loaded yet */ }
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Progress polling.
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const p = playerRef.current;
      if (p && !seeking) {
        setCurrent(p.getCurrentTime());
        setBuffered(p.getVideoLoadedFraction());
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, seeking]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  }, [playing]);

  const seekBy = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(p.getDuration(), p.getCurrentTime() + delta));
    p.seekTo(next, true);
    setCurrent(next);
  }, []);

  const seekTo = useCallback((fraction: number) => {
    const p = playerRef.current;
    if (!p) return;
    const target = fraction * (p.getDuration() || 0);
    p.seekTo(target, true);
    setCurrent(target);
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); }
    else { p.mute(); setMuted(true); }
  }, []);

  const changeVolume = useCallback((v: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVolume(v);
    if (v === 0) { p.mute(); setMuted(true); }
    else if (p.isMuted()) { p.unMute(); setMuted(false); }
  }, []);

  const changeQuality = useCallback((q: string) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackQuality(q);
    setQuality(q);
    setShowSettings(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (captionsOn) {
      p.setOption("captions", "track", {});
      setCaptionsOn(false);
    } else {
      const track = captionTracks[0];
      p.setOption("captions", "track", track ?? { languageCode: "en" });
      setCaptionsOn(true);
    }
  }, [captionsOn, captionTracks]);

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current.requestFullscreen();
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  const onProgressPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(fraction);
  };

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = buffered * 100;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full aspect-video bg-black overflow-hidden rounded-lg select-none"
      onMouseMove={() => { setShowControls(true); scheduleHide(); }}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* The actual YouTube iframe — pointer-events is set on this wrapper (not the node the
          YT API replaces) so it inherits onto the injected iframe, making it fully
          non-interactive: no native title, share, or "Watch on YouTube" link is reachable.
          All interaction goes through our own controls below. */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div id={domId} ref={containerRef} className="w-full h-full" />
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}

      {/* Click surface: single click toggles play/pause, double-click sides to seek. */}
      <div
        className="absolute inset-0 z-10"
        onClick={togglePlay}
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const half = rect.width / 2;
          seekBy(e.clientX - rect.left < half ? -10 : 10);
        }}
      >
        {ready && !playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Custom control bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-2 sm:px-3 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <div
          className="group relative h-3 w-full flex items-center cursor-pointer"
          onPointerDown={(e) => { setSeeking(true); onProgressPointer(e); }}
          onPointerMove={(e) => { if (e.buttons === 1 && seeking) onProgressPointer(e); }}
          onPointerUp={() => setSeeking(false)}
        >
          <div className="relative w-full h-1 group-hover:h-1.5 rounded-full bg-white/25 transition-all">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: `${progressPct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-red-600 opacity-0 group-hover:opacity-100"
              style={{ left: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 mt-1">
          <button type="button" onClick={togglePlay} className="p-1.5 text-white hover:text-white/80" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-4 w-4" fill="white" /> : <Play className="h-4 w-4" fill="white" />}
          </button>
          <button type="button" onClick={() => seekBy(-10)} className="p-1.5 text-white hover:text-white/80" aria-label="Back 10 seconds">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => seekBy(10)} className="p-1.5 text-white hover:text-white/80" aria-label="Forward 10 seconds">
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 group/vol">
            <button type="button" onClick={toggleMute} className="p-1.5 text-white hover:text-white/80" aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-red-600 h-1 cursor-pointer"
            />
          </div>

          <span className="text-[11px] sm:text-xs text-white/90 tabular-nums ml-1">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {captionTracks.length > 0 && (
            <button
              type="button"
              onClick={toggleCaptions}
              className={`p-1.5 hover:text-white/80 ${captionsOn ? "text-red-500" : "text-white"}`}
              aria-label="Toggle captions"
            >
              <Captions className="h-4 w-4" />
            </button>
          )}

          {qualities.length > 0 && (
            <div className="relative">
              <button type="button" onClick={() => setShowSettings((s) => !s)} className="p-1.5 text-white hover:text-white/80" aria-label="Quality settings">
                <Settings className="h-4 w-4" />
              </button>
              {showSettings && (
                <div className="absolute bottom-8 right-0 bg-black/90 rounded-md py-1 min-w-[100px] shadow-lg">
                  {["auto", ...qualities].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => changeQuality(q)}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 ${quality === q ? "text-red-500" : "text-white"
                        }`}
                    >
                      {QUALITY_LABELS[q] ?? q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={toggleFullscreen} className="p-1.5 text-white hover:text-white/80" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {title && (
        <div className={`absolute top-0 left-0 right-0 z-20 px-3 py-2 text-sm font-medium text-white bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0"}`}>
          {title}
        </div>
      )}
    </div>
  );
}

export default YouTubePlayer;
