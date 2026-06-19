import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CENTERS as STATIC_CENTERS, THEME_IMAGE, type Center, type CenterTheme } from "@/data/centres";

export type DBCenter = Center & {
  id: string;
  image_url: string | null;
  is_published: boolean;
  sort_order: number;
  is_pinned?: boolean;
};

const mapRow = (r: any): DBCenter => ({
  id: r.id,
  slug: r.slug,
  city: r.city,
  area: r.area ?? undefined,
  state: r.state,
  region: r.region,
  address: r.address ?? "",
  phone: r.phone ?? "",
  email: r.email ?? undefined,
  isHQ: !!r.is_hq,
  established: r.established ?? undefined,
  theme: (r.theme ?? "metro") as CenterTheme,
  image_url: r.image_url ?? null,
  verified: !!r.verified,
  is_published: r.is_published,
  sort_order: r.sort_order ?? 0,
  is_pinned: !!r.is_pinned,
});

const sortCentres = (list: DBCenter[]): DBCenter[] => {
  const isPinned = (c: DBCenter) =>
    !!c.is_pinned || c.isHQ || c.city.toLowerCase() === "kota";
  const pinned = list
    .filter(isPinned)
    .sort((a, b) => a.city.localeCompare(b.city, "en", { sensitivity: "base" }));
  const rest = list
    .filter((c) => !isPinned(c))
    .sort((a, b) => a.city.localeCompare(b.city, "en", { sensitivity: "base" }));
  return [...pinned, ...rest];
};

const FALLBACK = sortCentres(
  STATIC_CENTERS.map((c, i) => ({ ...c, id: c.slug, image_url: null, is_published: true, sort_order: i })),
);

export const useCenters = () => {
  const query = useQuery({
    queryKey: ["centres", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .eq("is_published", true)
        .limit(500);
      if (error) throw error;
      if (!data || !data.length) return FALLBACK;
      return sortCentres(data.map(mapRow));
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: FALLBACK,
  });

  return { centers: query.data ?? FALLBACK, loading: query.isPending };
};

export const getCenterImage = (c: DBCenter): string => c.image_url || THEME_IMAGE[c.theme];
