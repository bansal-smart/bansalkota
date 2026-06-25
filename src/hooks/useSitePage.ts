import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SitePage = {
  slug: string;
  title: string;
  content_html: string;
  updated_at: string;
};

export function useSitePage(slug: string) {
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_pages")
        .select("slug,title,content_html,updated_at")
        .eq("slug", slug)
        .maybeSingle();
      if (!cancelled) {
        setPage((data as SitePage | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { page, loading };
}
