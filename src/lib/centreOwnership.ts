import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the centre a newly-created course/test/test-series should be
 * owned by, and whether it's global. Shared by CreateCoursePage,
 * CreateTestPage and CreateTestSeriesPage so the rule lives in one place:
 * a franchise centre admin owns + keeps their own content centre-local;
 * everyone else (admin/super_admin) creates HQ-owned, Kota-local content by
 * default (global visibility is a separate, explicit opt-in in the relevant
 * form, not decided here).
 */
export async function resolveContentOwnership(
  isCenterAdmin: boolean,
  primaryCenterId: string | null,
): Promise<{ centre_id: string | null; is_global: boolean }> {
  if (isCenterAdmin) {
    return { centre_id: primaryCenterId, is_global: false };
  }
  // More than one centre can be flagged HQ; `.maybeSingle()` errors on that and
  // used to yield a NULL centre_id, which every centre reads as "global".
  const { data: hq, error } = await supabase
    .from("centres")
    .select("id")
    .eq("is_hq", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !hq) throw new Error("Could not determine the HQ centre for this content");
  return { centre_id: hq.id, is_global: false };
}
