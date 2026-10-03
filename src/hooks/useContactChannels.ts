import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ContactChannel = {
  id: string;
  kind: "phone" | "email" | "whatsapp";
  label: string;
  value: string;
  href: string;
  display_order: number;
  is_active: boolean;
};

export function useContactChannels() {
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contact_channels")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      setChannels((data ?? []) as ContactChannel[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { channels, loading };
}
