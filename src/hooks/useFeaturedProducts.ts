import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeaturedItem, FeaturedKind } from "@/lib/landingSchemas";

export type ResolvedProduct = {
  kind: FeaturedKind;
  ref_id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  price?: number | null;
  badge?: string;
  link: string;
};

const groupByKind = (items: FeaturedItem[]) => {
  const m: Record<FeaturedKind, string[]> = { test_series: [], course: [], book: [] };
  items.forEach((it) => {
    if (it.ref_id) m[it.kind].push(it.ref_id);
  });
  return m;
};

export function useFeaturedProducts(items: FeaturedItem[]) {
  return useQuery({
    queryKey: ["landing-featured", items.map((i) => `${i.kind}:${i.ref_id}`).join("|")],
    queryFn: async (): Promise<ResolvedProduct[]> => {
      if (!items?.length) return [];
      const grouped = groupByKind(items);
      const [ts, cs, bs] = await Promise.all([
        grouped.test_series.length
          ? supabase.from("test_series").select("id,slug,title,subject,thumbnail_url,price,target_exam").in("id", grouped.test_series)
          : Promise.resolve({ data: [] as any[] }),
        grouped.course.length
          ? supabase.from("courses").select("id,slug,name,subject,thumbnail_url,price,educator_name,badge").in("id", grouped.course)
          : Promise.resolve({ data: [] as any[] }),
        grouped.book.length
          ? supabase.from("books").select("id,slug,title,subject,cover_url,price,author").in("id", grouped.book)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const tsMap = new Map<string, any>((ts.data || []).map((r: any) => [r.id, r]));
      const csMap = new Map<string, any>((cs.data || []).map((r: any) => [r.id, r]));
      const bsMap = new Map<string, any>((bs.data || []).map((r: any) => [r.id, r]));

      return items
        .map((it): ResolvedProduct | null => {
          if (it.kind === "test_series") {
            const r = tsMap.get(it.ref_id);
            if (!r) return null;
            return {
              kind: it.kind, ref_id: it.ref_id, title: r.title, subtitle: [r.target_exam, r.subject].filter(Boolean).join(" · "),
              image_url: r.thumbnail_url, price: r.price, badge: it.badge,
              link: it.link_override || `/test-series/${r.slug}`,
            };
          }
          if (it.kind === "course") {
            const r = csMap.get(it.ref_id);
            if (!r) return null;
            return {
              kind: it.kind, ref_id: it.ref_id, title: r.name, subtitle: r.educator_name || r.subject,
              image_url: r.thumbnail_url, price: r.price, badge: it.badge || r.badge,
              link: it.link_override || `/courses/${r.slug}`,
            };
          }
          const r = bsMap.get(it.ref_id);
          if (!r) return null;
          return {
            kind: it.kind, ref_id: it.ref_id, title: r.title, subtitle: r.author || r.subject,
            image_url: r.cover_url, price: r.price, badge: it.badge,
            link: it.link_override || `/books/${r.slug}`,
          };
        })
        .filter((x): x is ResolvedProduct => !!x);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!items?.length,
  });
}

// Helper for the admin picker
export function useProductOptions(kind: FeaturedKind, search: string) {
  return useQuery({
    queryKey: ["product-options", kind, search],
    queryFn: async () => {
      if (kind === "test_series") {
        let q = supabase.from("test_series").select("id,title,target_exam,thumbnail_url").eq("is_published", true).limit(20);
        if (search) q = q.ilike("title", `%${search}%`);
        const { data } = await q;
        return (data || []).map((r: any) => ({ id: r.id, label: r.title, subtitle: r.target_exam, image: r.thumbnail_url }));
      }
      if (kind === "course") {
        let q = supabase.from("courses").select("id,name,educator_name,thumbnail_url").eq("is_published", true).limit(20);
        if (search) q = q.ilike("name", `%${search}%`);
        const { data } = await q;
        return (data || []).map((r: any) => ({ id: r.id, label: r.name, subtitle: r.educator_name, image: r.thumbnail_url }));
      }
      let q = supabase.from("books").select("id,title,author,cover_url").eq("is_published", true).limit(20);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data } = await q;
      return (data || []).map((r: any) => ({ id: r.id, label: r.title, subtitle: r.author, image: r.cover_url }));
    },
    staleTime: 60_000,
  });
}
