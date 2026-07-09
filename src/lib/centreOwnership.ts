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
  const { data: hq } = await supabase.from("centres").select("id").eq("is_hq", true).maybeSingle();
  return { centre_id: hq?.id ?? null, is_global: false };
}
