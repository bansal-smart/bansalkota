import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestSeriesRow = {
  id: string;
  slug: string;
  title: string;
  target_exam: string | null;
  subject: string | null;
  description: string | null;
  thumbnail_url: string | null;
  total_tests: number;
  duration_months: number | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  features: string[] | null;
  is_published: boolean;
  is_featured: boolean;
};

const SERIES_COLUMNS =
  "id, slug, title, target_exam, subject, description, thumbnail_url, total_tests, duration_months, price, original_price, discount_percent, features, is_published, is_featured";

export const useTestSeriesList = (exam?: string) => {
  const query = useQuery({
    queryKey: ["test_series", "list", exam ?? "All"],
    queryFn: async () => {
      let q = supabase
        .from("test_series")
        .select(SERIES_COLUMNS)
        .eq("is_published", true)
        .order("is_featured", { ascending: false });
      if (exam && exam !== "All") q = q.eq("target_exam", exam);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TestSeriesRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { list: query.data ?? [], loading: query.isPending };
};

export const useTestSeriesDetail = (slug: string | undefined) => {
  const query = useQuery({
    queryKey: ["test_series", "detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_series")
        .select(SERIES_COLUMNS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TestSeriesRow | null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { item: query.data ?? null, loading: query.isPending };
};
