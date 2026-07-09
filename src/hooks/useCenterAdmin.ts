import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type CenterStaffRow = {
  id: string;
  centre_id: string;
  role: string;
  center?: {
    id: string;
    slug: string;
    city: string;
    area: string | null;
    state: string;
    is_hq: boolean;
    is_suspended: boolean;
  } | null;
};

/**
 * Resolves the centre(s) the currently signed-in user manages.
 * Returns the primary centre (first row) for convenience.
 *
 * Only queries for `center_admin` sessions — this hook is called on every
 * /admin/* page render (AdminLayout, the create-course/test flows), and the
 * vast majority of that traffic is plain admin/super_admin, who never have a
 * centre_staff row anyway. Skipping the query for them avoids a wasted round
 * trip on every single admin page load.
 */
export const useCenterAdmin = () => {
  const { user, roleReady, isCenterAdmin } = useAuth();
  const [memberships, setMemberships] = useState<CenterStaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleReady) return;
    if (!user || !isCenterAdmin) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("centre_staff" as any)
        .select("id, centre_id, role, center:centres(id, slug, city, area, state, is_hq, is_suspended)")
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
  }, [user, roleReady, isCenterAdmin]);

  const primary = memberships[0] ?? null;
  return {
    memberships,
    primaryCenterId: primary?.centre_id ?? null,
    primaryCenter: primary?.center ?? null,
    isHq: !!primary?.center?.is_hq,
    loading,
  };
};
