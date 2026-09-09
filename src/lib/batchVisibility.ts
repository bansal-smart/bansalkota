import { supabase } from "@/integrations/supabase/client";

export type BatchVisibility = "global" | "centre_specific" | "disabled";

export type VisibilityAwareBatch = {
  id: string;
  visibility: BatchVisibility;
};

// `disabled` batches are already excluded from non-admin reads at the RLS
// layer (see 20260909140000_batch_visibility_control.sql) — this filter
// exists for `centre_specific` (arbitrary per-centre allow-list, which RLS
// doesn't attempt to enforce, matching the existing course/test/series
// pattern of scoping in the query layer, not RLS — see centreScope.ts) and
// as a second guard against `disabled` rows the Super Admin's own unscoped
// fetch does return, wherever that fetch is reused for a centre-scoped view.
// Pass `centreId: null` for the Super Admin / unscoped view — nothing is
// filtered out, since that view is the one place disabled/centre-restricted
// rows need to stay visible for management.
export async function filterBatchesForCentre<T extends VisibilityAwareBatch>(
  batches: T[],
  centreId: string | null,
): Promise<T[]> {
  if (!centreId) return batches;

  const candidateIds = batches
    .filter((b) => b.visibility === "centre_specific")
    .map((b) => b.id);

  let allowedIds = new Set<string>();
  if (candidateIds.length) {
    const { data } = await supabase
      .from("batch_centre_visibility")
      .select("batch_id")
      .eq("centre_id", centreId)
      .in("batch_id", candidateIds);
    allowedIds = new Set((data ?? []).map((r: { batch_id: string }) => r.batch_id));
  }

  return batches.filter((b) => {
    if (b.visibility === "disabled") return false;
    if (b.visibility === "global") return true;
    return allowedIds.has(b.id);
  });
}
