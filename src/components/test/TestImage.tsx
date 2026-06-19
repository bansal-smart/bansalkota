import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCw, ImageOff } from "lucide-react";

interface TestImageProps {
  src: string;
  alt?: string;
  className?: string;
  maxRetries?: number;
  onClick?: () => void;
}

/**
 * Resilient image component for the test engine.
 * - Shows a spinner while loading.
 * - Auto-retries up to `maxRetries` times with exponential backoff on error.
 * - Falls back to a manual "Retry" button if all attempts fail.
 * - Cache-busts retries to bypass a possibly corrupt CDN entry.
 */
export function TestImage({
  src,
  alt = "",
  className = "",
  maxRetries = 3,
  onClick,
}: TestImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setStatus("loading");
    setAttempt(0);
  }, [src]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const finalSrc = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}_r=${attempt}`;

  const scheduleRetry = () => {
    if (attempt >= maxRetries) {
      setStatus("error");
      return;
    }
    const delay = Math.min(2000, 300 * Math.pow(2, attempt));
    timerRef.current = window.setTimeout(() => {
      setAttempt((a) => a + 1);
      setStatus("loading");
    }, delay);
  };

  const manualRetry = () => {
    setAttempt((a) => a + 1);
    setStatus("loading");
  };

  return (
    <div className="relative inline-block min-h-[80px]">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-xs text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading image…
        </div>
      )}
      {status === "error" ? (
        <button
          type="button"
          onClick={manualRetry}
          className="flex items-center gap-2 rounded border border-dashed border-red-300 bg-red-50 px-4 py-6 text-xs text-red-700 hover:bg-red-100"
        >
          <ImageOff className="h-4 w-4" />
          Image failed to load.
          <span className="ml-1 inline-flex items-center gap-1 font-semibold underline">
            <RotateCw className="h-3 w-3" /> Retry
          </span>
        </button>
      ) : (
        <img
          key={attempt}
          src={finalSrc}
          alt={alt}
          onClick={onClick}
          onLoad={() => setStatus("loaded")}
          onError={scheduleRetry}
          draggable={false}
          className={`${className} ${status === "loaded" ? "opacity-100" : "opacity-0"} transition-opacity`}
        />
      )}
    </div>
  );
}

export default TestImage;
