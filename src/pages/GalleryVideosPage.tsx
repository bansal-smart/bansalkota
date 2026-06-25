import { useEffect, useState } from "react";
import { Loader2, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

type VideoAlbum = {
  id: string;
  title: string;
  video_url: string | null;
  cover_url: string | null;
  sort_order: number;
};

const isYouTube = (url: string) => /youtu\.?be/.test(url);
const toYouTubeEmbed = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}`;
    if (u.pathname.startsWith("/embed/")) return url;
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
  } catch {}
  return url;
};

const GalleryVideosPage = () => {
  const [videos, setVideos] = useState<VideoAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from("gallery_albums")
        .select("*")
        .eq("kind", "video")
        .eq("is_active", true)
        .order("sort_order");
      setVideos((data ?? []) as VideoAlbum[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bansal-blue-light/30 to-background">
      <section className="bg-bansal-blue text-white py-14">
        <div className="container mx-auto px-4 text-center">
          <VideoIcon className="h-10 w-10 mx-auto mb-3 text-bansal-orange" />
          <h1 className="text-3xl md:text-4xl font-black">Video Gallery</h1>
          <p className="mt-2 text-white/80 max-w-2xl mx-auto">
            Watch moments and milestones from The Bansal Journey: Transforming Education.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <h2 className="text-center text-xl md:text-2xl font-bold text-bansal-blue mb-2">
          The Bansal Journey: Transforming Education
        </h2>
        <div className="mx-auto w-14 h-0.5 bg-bansal-orange/70 mb-8" />

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-bansal-blue" />
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-border p-12 text-center text-muted-foreground">
            No videos available yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl bg-white border-2 border-bansal-blue/30 overflow-hidden shadow-sm flex flex-col"
              >
                <div className="relative flex items-center justify-center pt-3">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full p-2 border-2 border-bansal-blue/30">
                    <VideoIcon className="h-5 w-5 text-bansal-blue" />
                  </div>
                </div>
                <div className="px-3 pt-6 pb-3">
                  <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                    {v.video_url ? (
                      isYouTube(v.video_url) ? (
                        <iframe
                          src={toYouTubeEmbed(v.video_url)}
                          title={v.title}
                          allowFullScreen
                          className="w-full h-full"
                        />
                      ) : (
                        <video
                          src={v.video_url}
                          poster={v.cover_url ?? undefined}
                          controls
                          className="w-full h-full object-contain bg-black"
                        />
                      )
                    ) : v.cover_url ? (
                      <img src={v.cover_url} alt={v.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="px-4 pb-4 text-center">
                  <p className="text-sm font-bold text-bansal-blue">{v.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryVideosPage;
