import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  subject: string | null;
  target_exam: string | null;
  class_level: string | null;
  description: string | null;
  cover_url: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  stock: number;
  is_published: boolean;
  tags: string[] | null;
};

const BOOK_COLUMNS =
  "id, slug, title, author, subject, target_exam, class_level, description, cover_url, price, original_price, discount_percent, stock, is_published, tags";

export const useBooks = (filter?: { exam?: string; classLevel?: string }) => {
  const query = useQuery({
    queryKey: ["books", { exam: filter?.exam ?? "All", classLevel: filter?.classLevel ?? "All" }],
    queryFn: async () => {
      let q = supabase
        .from("books")
        .select(BOOK_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (filter?.exam && filter.exam !== "All") q = q.eq("target_exam", filter.exam);
      if (filter?.classLevel && filter.classLevel !== "All") q = q.eq("class_level", filter.classLevel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BookRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { books: query.data ?? [], loading: query.isPending };
};

export const useBookDetail = (slug: string | undefined) => {
  const query = useQuery({
    queryKey: ["book", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(BOOK_COLUMNS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BookRow | null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { book: query.data ?? null, loading: query.isPending };
};
