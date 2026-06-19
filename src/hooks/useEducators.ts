import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicEducator = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  subject: string | null;
  bio: string | null;
  city: string | null;
};

export const useEducators = () => {
  const query = useQuery({
    queryKey: ["educators", "public"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [] as PublicEducator[];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, city")
        .in("user_id", ids);
      return (profs ?? [])
        .filter((p: any) => p.full_name)
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url ?? null,
          subject: null,
          bio: null,
          city: p.city ?? null,
        })) as PublicEducator[];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { educators: query.data ?? [], loading: query.isPending };
};
