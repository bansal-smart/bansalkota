import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UpcomingBatch = {
  id: string;
  name: string;
  slug: string;
  target_exam: string | null;
  level: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  educator_name: string;
  thumbnail_url: string | null;
  badge: string | null;
  total_enrolled: number | null;
};

export function useUpcomingBatches(limit = 6) {
  return useQuery({
    queryKey: ["landing-upcoming", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select(
          "id,name,slug,target_exam,level,price,original_price,discount_percent,educator_name,thumbnail_url,badge,total_enrolled,is_featured,is_published,created_at",
        )
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as UpcomingBatch[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type TopperRow = {
  id: string;
  name: string;
  exam: string;
  rank_label: string | null;
  score: string | null;
  photo_url: string | null;
  city: string | null;
  year: number | null;
  quote: string | null;
};

export function useTopToppers(limit = 8) {
  return useQuery({
    queryKey: ["landing-toppers", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("toppers")
        .select("id,name,exam,rank_label,score,photo_url,city,year,quote,sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .limit(limit);
      return (data ?? []) as TopperRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type CentreShowcase = {
  id: string;
  city: string;
  state: string;
  slug: string;
  region: string;
  is_hq: boolean;
};

export function useCentresShowcase() {
  return useQuery({
    queryKey: ["landing-centres"],
    queryFn: async () => {
      const { data } = await supabase
        .from("centers")
        .select("id,city,state,slug,region,is_hq,is_published,sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .limit(60);
      return (data ?? []) as CentreShowcase[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
