import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LandingAdvantage = {
  id: string;
  title: string | null;
  image_url: string;
  alt_text: string | null;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

export function useLandingAdvantages(opts: { activeOnly?: boolean } = {}) {
  const [items, setItems] = useState<LandingAdvantage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = (supabase.from("landing_advantages" as any) as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (opts.activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    setItems(((data ?? []) as LandingAdvantage[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [opts.activeOnly]);

  return { items, loading, reload: load };
}
