import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LandingConfig } from "@/lib/landingSchemas";

export function useLandingConfig() {
  return useQuery({
    queryKey: ["landing_page_config", "default"],
    queryFn: async (): Promise<LandingConfig | null> => {
      const { data, error } = await supabase
        .from("landing_page_config" as any)
        .select("*")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as LandingConfig) ?? null;
    },
    staleTime: 60_000,
  });
}
