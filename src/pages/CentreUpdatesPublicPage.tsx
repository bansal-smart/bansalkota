import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Megaphone, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Update = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  posted_at: string;
};

type Centre = { id: string; slug: string; city: string; area: string | null };

const CentreUpdatesPublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [centre, setCentre] = useState<Centre | null>(null);
  const [items, setItems] = useState<Update[]>([]);
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
      const { data: u } = await (supabase as any)
        .from("centre_updates")
        .select("id, title, body, image_url, posted_at")
        .eq("centre_id", c.id)
        .eq("is_published", true)
        .order("posted_at", { ascending: false });
      setItems((u ?? []) as Update[]);
      setLoading(false);
    })();
  }, [slug]);

  const displayName = centre
    ? `${centre.city}${centre.area && centre.area !== centre.city ? ` — ${centre.area}` : ""}`
    : "";

  return (
    <main className="min-h-screen bg-bansal-cream/30">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link
          to={`/centres/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-bansal-orange hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to centre
        </Link>
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-black text-bansal-black flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-bansal-orange" /> Updates & Feed
          </h1>
          {centre && (
            <p className="text-sm text-muted-foreground mt-1">
              Bansal Classes · {displayName}
            </p>
          )}
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No updates posted yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map((u) => (
              <Link
                key={u.id}
                to={`/centres/${slug}/updates/${u.id}`}
                className="group block rounded-xl border border-border bg-white p-5 hover:shadow-md hover:border-bansal-orange/40 transition"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Calendar className="h-3.5 w-3.5 text-bansal-orange" />
                  {new Date(u.posted_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg font-bold text-bansal-black mb-1 group-hover:text-bansal-orange transition-colors">
                      {u.title}
                    </h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                      {u.body}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-bansal-orange mt-2">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  {u.image_url && (
                    <img
                      src={u.image_url}
                      alt={u.title}
                      loading="lazy"
                      className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-lg shrink-0"
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default CentreUpdatesPublicPage;
