import { supabase } from "@/integrations/supabase/client";

const STAFF_ROLES = ["center_admin", "admin", "super_admin"] as const;
const PAGE = 1000;

export function supabaseErrorMessage(e: unknown): string {
  if (!e) return "Unknown error";
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    if (o.message) return o.message;
    if (o.details) return o.details;
  }
  return String(e);
}

/**
 * Staff / centre-staff IDs only. `centre_staff` is best-effort — a RLS failure
 * must not blank out the whole student list.
 */
export async function fetchStaffUserIds(): Promise<string[]> {
  const ids = new Set<string>();

  const { data: roleRows, error: roleErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", [...STAFF_ROLES]);
  if (roleErr) throw roleErr;
  for (const r of roleRows ?? []) ids.add(r.user_id);

  const { data: staffRows } = await supabase.from("centre_staff").select("user_id");
  for (const r of staffRows ?? []) ids.add(r.user_id);

  return [...ids];
}

export function excludeStaffFromProfiles<Q extends { not: (column: string, op: string, value: string) => Q }>(
  query: Q,
  staffIds: string[],
): Q {
  if (!staffIds.length) return query;
  return query.not("user_id", "in", `(${staffIds.join(",")})`);
}

type ProfileRow = { user_id: string };

/**
 * Page through `profiles` with `.range()` only — never `.in(user_id, hundreds of UUIDs)`.
 * That oversized GET is ~25KB and PostgREST/Kong return 400 or "No API key found".
 */
export async function fetchNonStaffProfiles<T extends ProfileRow>(
  select: string,
  order: { column: string; ascending: boolean },
): Promise<T[]> {
  const staffIds = new Set(await fetchStaffUserIds());
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .order(order.column, { ascending: order.ascending })
      .range(from, from + PAGE - 1);

    if (error) throw error;

    const chunk = (data ?? []) as T[];
    for (const row of chunk) {
      if (!staffIds.has(row.user_id)) all.push(row);
    }
    if (chunk.length < PAGE) break;
    from += PAGE;
  }

  return all;
}
