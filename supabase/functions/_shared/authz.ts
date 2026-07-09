// Shared caller-authorization resolver for edge functions gated to
// admin/super_admin/center_admin. Centralizes "who is this bearer token, what
// platform role do they have, and which centres are they staff at" so every
// function that needs a centre-ownership check (not just a role check) can
// enforce it consistently instead of re-deriving it ad hoc.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type CallerAccess = {
  userId: string;
  isAdminOrSuper: boolean;
  /** Centre ids this user is centre_staff at (empty for plain admin/super_admin/student). */
  centreIds: Set<string>;
};

/** Throws on a missing/invalid token — callers should catch and return 401. */
export async function resolveCallerAccess(admin: SupabaseClient, token: string): Promise<CallerAccess> {
  const { data: userRes, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !userRes?.user) throw new Error("Unauthorized");
  const userId = userRes.user.id;

  const [{ data: roles }, { data: staff }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("centre_staff").select("centre_id").eq("user_id", userId),
  ]);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));

  return {
    userId,
    isAdminOrSuper: roleSet.has("admin") || roleSet.has("super_admin"),
    centreIds: new Set((staff ?? []).map((s: { centre_id: string }) => s.centre_id)),
  };
}
