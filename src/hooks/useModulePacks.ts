import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PackRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  target_exam: string | null;
  class_level: string | null;
  price: number;
  original_price: number | null;
  is_published: boolean;
  sort_order: number;
};

export type PackItemRow = {
  id: string;
  pack_id: string;
  book_id: string;
  position: number;
  book?: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    price: number;
  } | null;
};

export const useModulePacks = (filter?: { exam?: string; classLevel?: string }) => {
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("module_packs")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (filter?.exam && filter.exam !== "All") q = q.eq("target_exam", filter.exam);
      if (filter?.classLevel && filter.classLevel !== "All") q = q.eq("class_level", filter.classLevel);
      const { data } = await q;
      if (!cancelled) {
        setPacks((data ?? []) as PackRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter?.exam, filter?.classLevel]);

  return { packs, loading };
};

export const usePackDetail = (slug: string | undefined) => {
  const [pack, setPack] = useState<PackRow | null>(null);
  const [items, setItems] = useState<PackItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("module_packs").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      setPack((p ?? null) as PackRow | null);
      if (p) {
        const { data: its } = await supabase
          .from("module_pack_items")
          .select("id, pack_id, book_id, position, book:books(id, title, author, cover_url, price)")
          .eq("pack_id", (p as any).id)
          .order("position", { ascending: true });
        if (!cancelled) setItems((its ?? []) as unknown as PackItemRow[]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { pack, items, loading };
};
