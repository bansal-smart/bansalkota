import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type CenterStaffRow = {
  id: string;
  center_id: string;
  role: string;
  center?: {
    id: string;
    slug: string;
    city: string;
    area: string | null;
    state: string;
  } | null;
};

/**
 * Resolves the centre(s) the currently signed-in user manages.
 * Returns the primary centre (first row) for convenience.
 */
export const useCenterAdmin = () => {
  const { user, roleReady } = useAuth();
  const [memberships, setMemberships] = useState<CenterStaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleReady) return;
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("center_staff" as any)
        .select("id, center_id, role, center:centers(id, slug, city, area, state)")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load centre memberships", error);
        setMemberships([]);
      } else {
        setMemberships((data ?? []) as any);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, roleReady]);

  const primary = memberships[0] ?? null;
  return {
    memberships,
    primaryCenterId: primary?.center_id ?? null,
    primaryCenter: primary?.center ?? null,
    loading,
  };
};
