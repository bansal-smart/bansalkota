import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LandingHeroBanner = {
  id: string;
  image_url: string;
  alt: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
};

export function useLandingHeroBanners() {
  const [banners, setBanners] = useState<LandingHeroBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("landing_hero_banners" as any)
        .select("id, image_url, alt, link, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setBanners(((data ?? []) as any) as LandingHeroBanner[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { banners, loading };
}
