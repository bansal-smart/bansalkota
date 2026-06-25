import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = { src: string; alt: string; link: string | null };

type Props = {
  banners: Banner[];
  autoAdvanceMs?: number;
};

export default function HeroBannerCarousel({ banners, autoAdvanceMs = 4500 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = banners.length;
  const interactionTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [paused, total, autoAdvanceMs]);

  useEffect(() => {
    return () => {
      if (interactionTimeout.current) window.clearTimeout(interactionTimeout.current);
    };
  }, []);

  const pauseBriefly = () => {
    setPaused(true);
    if (interactionTimeout.current) window.clearTimeout(interactionTimeout.current);
    interactionTimeout.current = window.setTimeout(() => setPaused(false), 8000);
  };

  const go = (next: number) => {
    setIndex(((next % total) + total) % total);
    pauseBriefly();
  };

  if (total === 0) return null;

  return (
    <div
      className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((b, i) => {
          const img = (
            <img
              src={b.src}
              alt={b.alt}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          );
          return (
            <div key={i} className="h-full w-full shrink-0">

              {b.link ? (
                <a
                  href={b.link}
                  target={b.link.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block h-full w-full"
                >
                  {img}
                </a>
              ) : (
                img
              )}
            </div>
          );
        })}
      </div>

      <span className="absolute top-3 right-3 rounded-full bg-bansal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
        Latest Results
      </span>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-bansal-orange shadow-md grid place-items-center transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-bansal-orange shadow-md grid place-items-center transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-bansal-orange" : "w-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
