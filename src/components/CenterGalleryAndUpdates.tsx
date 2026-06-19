import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Megaphone, Calendar } from "lucide-react";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  kind: "achievement" | "event";
};

type UpdateItem = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  posted_at: string;
};

export default function CenterGalleryAndUpdates({ centerId }: { centerId: string }) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);

  useEffect(() => {
    if (!centerId) return;
    (async () => {
      const [g, u] = await Promise.all([
        supabase
          .from("centre_gallery")
          .select("id, image_url, caption, kind")
          .eq("centre_id", centerId)
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .limit(24),
        supabase
          .from("centre_updates")
          .select("id, title, body, image_url, posted_at")
          .eq("centre_id", centerId)
          .eq("is_published", true)
          .order("posted_at", { ascending: false })
          .limit(6),
      ]);
      if (g.data) setGallery(g.data as GalleryItem[]);
      if (u.data) setUpdates(u.data as UpdateItem[]);
    })();
  }, [centerId]);

  if (gallery.length === 0 && updates.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        {gallery.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold text-bansal-black mb-2 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-bansal-orange" />
              Centre gallery
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Achievements, events, and life on campus.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((g) => (
                <figure
                  key={g.id}
                  className="group relative rounded-xl overflow-hidden border border-border bg-white"
                >
                  <img
                    src={g.image_url}
                    alt={g.caption ?? "Centre photo"}
                    loading="lazy"
                    className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {g.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] font-medium text-white">
                      {g.caption}
                    </figcaption>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-bansal-orange text-white text-[10px] font-bold uppercase px-2 py-0.5">
                    {g.kind}
                  </span>
                </figure>
              ))}
            </div>
          </div>
        )}

        {updates.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold text-bansal-black mb-2 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-bansal-orange" />
              Centre updates & feeds
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Latest news straight from this centre.
            </p>
            <div className="space-y-4">
              {updates.map((u) => (
                <article
                  key={u.id}
                  className="rounded-xl border border-border bg-white p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5 text-bansal-orange" />
                    {new Date(u.posted_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <h3 className="font-display text-lg font-bold text-bansal-black mb-1">{u.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{u.body}</p>
                  {u.image_url && (
                    <img
                      src={u.image_url}
                      alt={u.title}
                      loading="lazy"
                      className="mt-3 max-h-72 rounded-lg object-cover"
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
