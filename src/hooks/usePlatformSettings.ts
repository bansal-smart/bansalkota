import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  id: number;
  site_name: string;
  maintenance_mode: boolean;
  open_registrations: boolean;
  admin_email_alerts: boolean;
};

const fetchSettings = async (): Promise<PlatformSettings | null> => {
  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as PlatformSettings) ?? null;
};

export const usePlatformSettings = () => {
  const q = useQuery({
    queryKey: ["platform_settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const ch = supabase
      .channel("platform-settings-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        () => q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [q]);

  return q;
};
