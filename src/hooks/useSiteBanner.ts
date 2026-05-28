import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteBanner = {
  id: string;
  page_key: string;
  image_url: string | null;
  headline: string | null;
  subheading: string | null;
  cta_label: string | null;
  cta_link: string | null;
  is_active: boolean;
};

/**
 * Returns the active admin-managed hero banner for the given page key.
 * Pages should pass a fallback image; if the admin hasn't set a banner the
 * fallback (the imported PNG) is used.
 */
export const useSiteBanner = (pageKey: string) => {
  const [banner, setBanner] = useState<SiteBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("site_banners")
        .select("*")
        .eq("page_key", pageKey)
        .eq("is_active", true)
        .maybeSingle();
      if (!ignore) {
        setBanner((data ?? null) as SiteBanner | null);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [pageKey]);

  return { banner, loading };
};
