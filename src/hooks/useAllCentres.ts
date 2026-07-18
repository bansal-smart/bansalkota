import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CentreOption = {
  id: string;
  city: string;
  area: string | null;
  state: string;
};

export const ALL_CENTRES_KEY = ["all_centres_options"] as const;

/**
 * Every centre in the system (not just published ones) — for admin pickers
 * like the centre-notification targeting UI. New centres appear here
 * automatically since it's a live query, not a hardcoded list.
 */
export const useAllCentres = () => {
  const query = useQuery({
    queryKey: ALL_CENTRES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("id, city, area, state")
        .order("city");
      if (error) throw error;
      return (data ?? []) as CentreOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { centres: query.data ?? [], loading: query.isPending };
};
