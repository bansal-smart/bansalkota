import { useEffect, useState } from "react";
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

export const useTestSeriesList = (exam?: string) => {
  const [list, setList] = useState<TestSeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("test_series").select("*").eq("is_published", true).order("is_featured", { ascending: false });
      if (exam && exam !== "All") q = q.eq("target_exam", exam);
      const { data } = await q;
      if (!cancelled) {
        setList((data ?? []) as TestSeriesRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam]);
  return { list, loading };
};

export const useTestSeriesDetail = (slug: string | undefined) => {
  const [item, setItem] = useState<TestSeriesRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("test_series").select("*").eq("slug", slug).maybeSingle();
      if (!cancelled) {
        setItem((data ?? null) as TestSeriesRow | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return { item, loading };
};
