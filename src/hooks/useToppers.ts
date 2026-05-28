import { useEffect, useState } from "react";
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
  const [toppers, setToppers] = useState<Topper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("toppers")
        .select("*")
        .eq("is_published", true)
        .order("sort_order")
        .limit(200);
      if (!ignore) {
        setToppers((data ?? []) as Topper[]);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return { toppers, loading };
};
