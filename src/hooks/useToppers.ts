import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Topper = {
  id: string;
  name: string;
  exam: string;
  rank_label: string | null;
  year: number | null;
  score: string | null;
  photo_url: string | null;
  quote: string | null;
  city: string | null;
  category: string | null;
  sort_order: number;
  is_published: boolean;
};

export const useToppers = () => {
  const query = useQuery({
    queryKey: ["toppers", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("toppers")
        .select(
          "id, name, exam, rank_label, year, score, photo_url, quote, city, category, sort_order, is_published"
        )
        .eq("is_published", true)
        .order("sort_order")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Topper[];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { toppers: query.data ?? [], loading: query.isPending };
};
