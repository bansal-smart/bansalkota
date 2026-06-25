import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

type Album = { id: string; title: string; cover_url: string | null; sort_order: number };
type AlbumImage = { id: string; album_id: string; image_url: string; sort_order: number };

const AlbumCarousel = ({ images, title }: { images: AlbumImage[]; title: string }) => {
  const [start, setStart] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const perPage = 3;
  const next = () => setStart((s) => Math.min(s + perPage, Math.max(0, images.length - perPage)));
  const prev = () => setStart((s) => Math.max(0, s - perPage));
  const visible = images.slice(start, start + perPage);

  return (
    <section className="rounded-2xl bg-white border border-border shadow-sm p-6 md:p-8">
      <h2 className="text-center text-xl md:text-2xl font-bold text-bansal-blue mb-2">{title}</h2>
      <div className="mx-auto w-14 h-0.5 bg-bansal-orange/70 mb-6" />
      <div className="relative">
        {start > 0 && (
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-5 z-10 rounded-full bg-white shadow-md p-2 border border-border hover:bg-bansal-blue hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {start + perPage < images.length && (
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-5 z-10 rounded-full bg-white shadow-md p-2 border border-border hover:bg-bansal-blue hover:text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {visible.map((im, idx) => (
            <button
              key={im.id}
              onClick={() => setLightbox(start + idx)}
              className="aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted group"
            >
              <img
                src={im.image_url}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
              />
            </button>
          ))}
          {visible.length === 0 && (
            <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">No images.</div>
          )}
        </div>
      </div>
      {images.length > perPage && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: Math.ceil(images.length / perPage) }).map((_, i) => {
            const active = Math.floor(start / perPage) === i;
            return (
              <button
                key={i}
                onClick={() => setStart(i * perPage)}
                className={`h-2 rounded-full transition-all ${active ? "w-6 bg-bansal-blue" : "w-2 bg-bansal-blue/30"}`}
              />
            );
          })}
        </div>
      )}

      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="h-7 w-7" />
          </button>
          {lightbox > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox - 1);
              }}
              className="absolute left-4 text-white p-2"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightbox < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox + 1);
              }}
              className="absolute right-4 text-white p-2"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          <img
            src={images[lightbox].image_url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

const GalleryImagesPage = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [images, setImages] = useState<Record<string, AlbumImage[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: a } = await sb
        .from("gallery_albums")
        .select("*")
        .eq("kind", "image")
        .eq("is_active", true)
        .order("sort_order");
      const list = (a ?? []) as Album[];
      setAlbums(list);
      if (list.length) {
        const { data: imgs } = await sb
          .from("gallery_album_images")
          .select("*")
          .in("album_id", list.map((x) => x.id))
          .order("sort_order");
        const grouped: Record<string, AlbumImage[]> = {};
        ((imgs ?? []) as AlbumImage[]).forEach((i) => {
          grouped[i.album_id] = grouped[i.album_id] || [];
          grouped[i.album_id].push(i);
        });
        setImages(grouped);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bansal-blue-light/30 to-background">
      <section className="bg-bansal-blue text-white py-14">
        <div className="container mx-auto px-4 text-center">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-bansal-orange" />
          <h1 className="text-3xl md:text-4xl font-black">Image Gallery</h1>
          <p className="mt-2 text-white/80 max-w-2xl mx-auto">
            Moments from the Bansal Classes campus — celebrations, events, and student life.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-8">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-bansal-blue" />
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-border p-12 text-center text-muted-foreground">
            No image albums available yet.
          </div>
        ) : (
          albums.map((a) => <AlbumCarousel key={a.id} title={a.title} images={images[a.id] ?? []} />)
        )}
      </div>
    </div>
  );
};

export default GalleryImagesPage;
