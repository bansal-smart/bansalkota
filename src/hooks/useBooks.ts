import { useEffect, useState } from "react";
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

export const useBooks = (filter?: { exam?: string; classLevel?: string }) => {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("books").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (filter?.exam && filter.exam !== "All") q = q.eq("target_exam", filter.exam);
      if (filter?.classLevel && filter.classLevel !== "All") q = q.eq("class_level", filter.classLevel);
      const { data } = await q;
      if (!cancelled) {
        setBooks((data ?? []) as BookRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter?.exam, filter?.classLevel]);

  return { books, loading };
};

export const useBookDetail = (slug: string | undefined) => {
  const [book, setBook] = useState<BookRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("books").select("*").eq("slug", slug).maybeSingle();
      if (!cancelled) {
        setBook((data ?? null) as BookRow | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return { book, loading };
};
