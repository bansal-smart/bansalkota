import { useQuery } from "@tanstack/react-query";
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

export const useSiteBanner = (pageKey: string) => {
  const query = useQuery({
    queryKey: ["site_banner", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_banners")
        .select("id, page_key, image_url, headline, subheading, cta_label, cta_link, is_active")
        .eq("page_key", pageKey)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SiteBanner | null;
    },
    staleTime: 10 * 60 * 1000,
  });
  return { banner: query.data ?? null, loading: query.isPending };
};
