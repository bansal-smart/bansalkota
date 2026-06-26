import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Banner = { id: string; image_url: string; link: string | null };

export default function CentreCarousel({ centerId }: { centerId: string }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("centre_carousel_banners" as any)
        .select("id, image_url, link, sort_order")
        .eq("centre_id", centerId)
        .eq("is_active", true)
        .order("sort_order");
      if (!cancelled) setBanners(((data ?? []) as any) as Banner[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const total = banners.length;

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), 4500);
    return () => window.clearInterval(id);
  }, [paused, total]);

  if (total === 0) return null;

  const go = (next: number) => setIndex(((next % total) + total) % total);

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
              src={b.image_url}
              alt=""
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          );
          return (
            <div key={b.id} className="h-full w-full shrink-0">
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
