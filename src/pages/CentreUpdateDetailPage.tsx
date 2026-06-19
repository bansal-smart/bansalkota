import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Megaphone, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Update = {
  id: string;
  centre_id: string;
  title: string;
  body: string;
  image_url: string | null;
  posted_at: string;
  is_published: boolean;
};

type Centre = { id: string; slug: string; city: string; area: string | null };

const CentreUpdateDetailPage = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [centre, setCentre] = useState<Centre | null>(null);
  const [item, setItem] = useState<Update | null>(null);
  const [related, setRelated] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !id) return;
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
      const { data: u } = await (supabase as any)
        .from("centre_updates")
        .select("*")
        .eq("id", id)
        .eq("centre_id", c.id)
        .eq("is_published", true)
        .maybeSingle();
      setItem((u as Update) ?? null);

      const { data: r } = await (supabase as any)
        .from("centre_updates")
        .select("id, title, body, image_url, posted_at, centre_id, is_published")
        .eq("centre_id", c.id)
        .eq("is_published", true)
        .neq("id", id)
        .order("posted_at", { ascending: false })
        .limit(3);
      setRelated((r ?? []) as Update[]);
      setLoading(false);
    })();
  }, [slug, id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item?.title ?? "Centre update", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const displayName = centre
    ? `${centre.city}${centre.area && centre.area !== centre.city ? ` — ${centre.area}` : ""}`
    : "";

  if (loading) {
    return (
      <main className="min-h-screen bg-bansal-cream/30">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">
          Loading…
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-bansal-cream/30">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-bansal-black mb-2">
            Update not found
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            This update may have been removed or unpublished.
          </p>
          <Link
            to={`/centres/${slug}/updates`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-bansal-orange hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> All updates
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bansal-cream/30">
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Link
          to={`/centres/${slug}/updates`}
          className="inline-flex items-center gap-1.5 text-sm text-bansal-orange hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> All updates
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3.5 w-3.5 text-bansal-orange" />
          {new Date(item.posted_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {centre && (
            <>
              <span className="text-bansal-orange">·</span>
              <span>Bansal Classes · {displayName}</span>
            </>
          )}
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-black text-bansal-black mb-5 leading-tight">
          {item.title}
        </h1>

        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full rounded-xl border border-border mb-6 object-cover max-h-[480px]"
          />
        )}

        <div className="prose prose-sm max-w-none text-bansal-black/90 whitespace-pre-line leading-relaxed">
          {item.body}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-bansal-orange/40 bg-white px-4 py-2 text-sm font-bold text-bansal-orange hover:bg-bansal-orange hover:text-white transition"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <Link
            to={`/centres/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-bansal-black hover:text-bansal-orange"
          >
            About this centre
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-bansal-black mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-bansal-orange" /> More from this centre
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/centres/${slug}/updates/${r.id}`}
                  className="group rounded-xl border border-border bg-white p-4 hover:shadow-md hover:border-bansal-orange/40 transition"
                >
                  {r.image_url && (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      loading="lazy"
                      className="h-28 w-full object-cover rounded-md mb-3"
                    />
                  )}
                  <div className="text-[11px] text-muted-foreground mb-1">
                    {new Date(r.posted_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <h3 className="font-display text-sm font-bold text-bansal-black group-hover:text-bansal-orange line-clamp-2">
                    {r.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
};

export default CentreUpdateDetailPage;
