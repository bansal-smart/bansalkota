import { useEffect, useState } from "react";
import { Award, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Poster = {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
};

const GalleryAchievementsPage = () => {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("achievement_posters")
        .select("id, image_url, caption, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error(error);
      }
      setPosters((data as Poster[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] text-white py-14 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/90 via-[hsl(var(--navy2))]/80 to-[hsl(222,47%,15%)]/95" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <Award className="h-10 w-10 mx-auto mb-3 text-bansal-orange" />
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Achievement Gallery
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Celebrating the remarkable results and milestones of Bansal Classes students.
          </p>
        </div>
      </section>

      {/* Image grid */}
      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-bansal-blue" />
          </div>
        ) : posters.length === 0 ? (
          <div className="rounded-2xl bg-card border border-dashed border-border p-12 text-center text-muted-foreground">
            No achievement posters available yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posters.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setLightbox(idx)}
                className="group text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={p.image_url}
                    alt={p.caption}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-bansal-blue text-center">{p.caption}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && posters[lightbox] && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setLightbox(null)}
          >
            <X className="h-7 w-7" />
          </button>

          {lightbox > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightbox < posters.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="flex flex-col items-center max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={posters[lightbox].image_url}
              alt={posters[lightbox].caption}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
            <p className="mt-3 text-white text-sm font-bold text-center">
              {posters[lightbox].caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryAchievementsPage;
