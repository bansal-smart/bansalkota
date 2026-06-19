import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Photo = {
  id: string;
  image_url: string;
  caption: string | null;
  kind: "achievement" | "event" | "activity" | "other";
};

type Centre = { id: string; slug: string; city: string; area: string | null };

const KIND_LABEL: Record<Photo["kind"], string> = {
  achievement: "Achievement",
  event: "Event",
  activity: "Activity",
  other: "Other",
};

const KINDS: ("all" | Photo["kind"])[] = ["all", "achievement", "event", "activity", "other"];

const CentreGalleryPublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [centre, setCentre] = useState<Centre | null>(null);
  const [items, setItems] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<(typeof KINDS)[number]>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: c } = await (supabase as any)
        .from("centres")
        .select("id, slug, city, area")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) {
        setLoading(false);
        return;
      }
      setCentre(c as Centre);
      const { data: g } = await (supabase as any)
        .from("centre_gallery")
        .select("id, image_url, caption, kind")
        .eq("centre_id", c.id)
        .eq("is_published", true)
        .order("sort_order");
      setItems((g ?? []) as Photo[]);
      setLoading(false);
    })();
  }, [slug]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.kind === filter)),
    [items, filter],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : (i + 1) % filtered.length));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, filtered.length]);

  const displayName = centre ? `${centre.city}${centre.area && centre.area !== centre.city ? ` — ${centre.area}` : ""}` : "";

  return (
    <main className="min-h-screen bg-bansal-cream/30">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <Link to={`/centres/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-bansal-orange hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to centre
        </Link>
        <header className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-black text-bansal-black flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-bansal-orange" /> Gallery
          </h1>
          {centre && <p className="text-sm text-muted-foreground mt-1">Bansal Classes · {displayName}</p>}
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {KINDS.map((k) => {
            const count = k === "all" ? items.length : items.filter((p) => p.kind === k).length;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${
                  filter === k
                    ? "bg-bansal-orange text-white border-bansal-orange"
                    : "bg-white text-bansal-black border-border hover:border-bansal-orange/60"
                }`}
              >
                {k === "all" ? "All" : KIND_LABEL[k as Photo["kind"]]} · {count}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos yet in this category.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {filtered.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setLightbox(idx)}
                className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-white hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <img
                    src={p.image_url}
                    alt={p.caption ?? `${KIND_LABEL[p.kind]} at ${displayName}`}
                    loading="lazy"
                    className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-bansal-orange text-white text-[10px] font-bold uppercase px-2 py-0.5">
                    {p.kind}
                  </span>
                </div>
                {p.caption && (
                  <p className="px-3 py-2 text-xs text-left text-bansal-black/80 line-clamp-2">{p.caption}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && filtered[lightbox] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
            }}
            className="absolute left-4 text-white/80 hover:text-white"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={filtered[lightbox].image_url}
              alt={filtered[lightbox].caption ?? "Centre photo"}
              className="max-h-[80vh] w-full object-contain rounded-lg"
            />
            {filtered[lightbox].caption && (
              <figcaption className="mt-3 text-center text-sm text-white/90">
                {filtered[lightbox].caption}
              </figcaption>
            )}
            <p className="mt-2 text-center text-xs text-white/60">
              {lightbox + 1} / {filtered.length}
            </p>
          </figure>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? null : (i + 1) % filtered.length));
            }}
            className="absolute right-4 text-white/80 hover:text-white"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </main>
  );
};

export default CentreGalleryPublicPage;
